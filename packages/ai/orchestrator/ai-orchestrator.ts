import { createHash, randomUUID } from 'crypto';
import type {
  AiGenerationMeta,
  AiOrchestratorConfig,
  DayBlocks,
  GenerateResult,
  TripInput,
  TripPlan,
} from '../types';
import { DayBlocksSchema, TripPlanSchema } from '../schemas';
import { SYSTEM_BASE } from '../prompts/system-base';
import { buildGenerateDayPrompt, buildPlanTripPrompt } from '../prompts';
import { buildRuleContext } from '../rules/travel-rules';
import { sanitizeAllowedBlocks } from '../validators/block-registry';
import { createLLMProvider, resolveOrchestratorConfig } from '../providers/factory';
import type { LLMProvider } from '../providers/types';
import { composeItinerary, mergeDayIntoItinerary } from './compose-itinerary';
import { countTripDays, normalizeTripInput } from './trip-input-normalizer';
import type { PoiRetriever } from '../rag/poi-retriever';
import { uncoveredPoiResult } from '../rag/poi-retriever';

export interface GenerationLogger {
  log(entry: {
    stage: 'plan' | 'day' | 'full';
    tripId: string;
    agencyId: string;
    userId: string;
    provider: string;
    model: string;
    promptHash: string;
    promptSnapshot: unknown;
    responseSnapshot: unknown;
    tokensIn: number;
    tokensOut: number;
    latencyMs: number;
    success: boolean;
    error?: string;
  }): void;
}

const noopLogger: GenerationLogger = { log: () => undefined };

export class AiOrchestrator {
  private provider: LLMProvider;

  constructor(
    config?: Partial<AiOrchestratorConfig>,
    private logger: GenerationLogger = noopLogger,
    private logContext?: { userId: string },
    private poiRetriever?: PoiRetriever
  ) {
    const resolved = resolveOrchestratorConfig(config);
    this.provider = createLLMProvider(resolved);
  }

  get providerName(): string {
    return this.provider.name;
  }

  get modelName(): string {
    return this.provider.model;
  }

  async generateFullItinerary(
    rawInput: TripInput,
    context?: {
      userId?: string;
      onDayGenerated?: (progress: {
        plan: TripPlan;
        dayBlocks: DayBlocks;
        dayResults: DayBlocks[];
        failedDays: Array<{ day: number; error: string }>;
        generationId: string;
        tokensIn: number;
        tokensOut: number;
        startedAt: number;
      }) => void | Promise<void>;
    }
  ): Promise<GenerateResult> {
    const input = normalizeTripInput(rawInput);
    const ruleCtx = buildRuleContext(input);
    const totalDays = countTripDays(input.startDate, input.endDate);
    const generationId = randomUUID();
    const started = Date.now();

    let tokensIn = 0;
    let tokensOut = 0;

    const planPrompt = buildPlanTripPrompt(input, ruleCtx.constraints, totalDays);
    const planGeneration = await this.generatePlanWithRecovery(input, totalDays, planPrompt);
    const plan = planGeneration.plan;

    tokensIn += planGeneration.tokensIn;
    tokensOut += planGeneration.tokensOut;

    this.logger.log({
      stage: 'plan',
      tripId: input.tripId,
      agencyId: input.agencyId,
      userId: context?.userId || this.logContext?.userId || 'system',
      provider: this.provider.name,
      model: this.provider.model,
      promptHash: hashPrompt(planPrompt),
      promptSnapshot: { prompt: planPrompt, input },
      responseSnapshot: plan,
      tokensIn: planGeneration.tokensIn,
      tokensOut: planGeneration.tokensOut,
      latencyMs: planGeneration.latencyMs,
      success: true,
      error: planGeneration.recoveredFrom,
    });

    const dayResults: DayBlocks[] = [];
    const failedDays: Array<{ day: number; error: string }> = [];
    const usedDiningPlaceNames = new Set<string>();

    for (const dayPlan of plan.days) {
      const previouslyUsedPlaceNames = Array.from(usedDiningPlaceNames);
      const poiContext = await this.retrievePois(input, dayPlan, previouslyUsedPlaceNames);
      const dayPrompt = buildGenerateDayPrompt(
        input,
        dayPlan,
        ruleCtx.constraints,
        poiContext,
        previouslyUsedPlaceNames
      );
      const diningCandidates = poiContext.pois
        .filter((poi) => ['restaurant', 'cafe', 'bar'].includes(poi.type))
        .map((poi) => poi.name);

      try {
        const dayGeneration = await this.generateDayWithRecovery(
          input,
          dayPlan,
          dayPrompt,
          ruleCtx.blockedTypes,
          previouslyUsedPlaceNames,
          diningCandidates
        );
        dayResults.push(dayGeneration.dayBlocks);
        for (const placeName of collectUsedDiningPlaceNames(dayGeneration.dayBlocks, diningCandidates)) {
          usedDiningPlaceNames.add(placeName);
        }

        tokensIn += dayGeneration.tokensIn;
        tokensOut += dayGeneration.tokensOut;

        this.logger.log({
          stage: 'day',
          tripId: input.tripId,
          agencyId: input.agencyId,
          userId: context?.userId || this.logContext?.userId || 'system',
          provider: this.provider.name,
          model: this.provider.model,
          promptHash: hashPrompt(dayPrompt),
          promptSnapshot: { prompt: dayPrompt, day: dayPlan.day },
          responseSnapshot: dayGeneration.dayBlocks,
          tokensIn: dayGeneration.tokensIn,
          tokensOut: dayGeneration.tokensOut,
          latencyMs: dayGeneration.latencyMs,
          success: true,
          error: dayGeneration.recoveredFrom,
        });

        await context?.onDayGenerated?.({
          plan,
          dayBlocks: dayGeneration.dayBlocks,
          dayResults: [...dayResults],
          failedDays: [...failedDays],
          generationId,
          tokensIn,
          tokensOut,
          startedAt: started,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failedDays.push({ day: dayPlan.day, error: message });

        this.logger.log({
          stage: 'day',
          tripId: input.tripId,
          agencyId: input.agencyId,
          userId: context?.userId || this.logContext?.userId || 'system',
          provider: this.provider.name,
          model: this.provider.model,
          promptHash: hashPrompt(dayPrompt),
          promptSnapshot: { prompt: dayPrompt, day: dayPlan.day },
          responseSnapshot: null,
          tokensIn: 0,
          tokensOut: 0,
          latencyMs: 0,
          success: false,
          error: message,
        });
      }
    }

    if (dayResults.length === 0) {
      throw new Error(failedDays[0]?.error || 'Nenhum dia do roteiro foi gerado pela IA');
    }

    const itinerary = composeItinerary(plan, dayResults);

    this.logger.log({
      stage: 'full',
      tripId: input.tripId,
      agencyId: input.agencyId,
      userId: context?.userId || this.logContext?.userId || 'system',
      provider: this.provider.name,
      model: this.provider.model,
      promptHash: generationId,
      promptSnapshot: input,
      responseSnapshot: { itineraryCount: itinerary.length, failedDays },
      tokensIn,
      tokensOut,
      latencyMs: Date.now() - started,
      success: true,
    });

    return {
      itinerary,
      plan,
      meta: {
        generationId,
        model: this.provider.model,
        provider: this.provider.name,
        totalTokensIn: tokensIn,
        totalTokensOut: tokensOut,
        latencyMs: Date.now() - started,
        daysGenerated: dayResults.length,
        failedDays: failedDays.length ? failedDays : undefined,
      },
    };
  }

  async regenerateDay(
    rawInput: TripInput,
    day: number,
    instruction?: string,
    context?: { userId?: string }
  ): Promise<{ dayBlocks: DayBlocks; meta: Pick<AiGenerationMeta, 'model' | 'provider'> }> {
    const input = normalizeTripInput(rawInput);
    const ruleCtx = buildRuleContext(input);
    const totalDays = countTripDays(input.startDate, input.endDate);

    const planPrompt = buildPlanTripPrompt(input, ruleCtx.constraints, totalDays);
    const planGeneration = await this.generatePlanWithRecovery(input, totalDays, planPrompt);
    const dayPlan = planGeneration.plan.days.find((entry) => entry.day === day);

    if (!dayPlan) {
      throw new Error(`Dia ${day} nao encontrado no plano da viagem`);
    }

    const poiContext = await this.retrievePois(input, dayPlan);
    let dayPrompt = buildGenerateDayPrompt(input, dayPlan, ruleCtx.constraints, poiContext);
    if (instruction?.trim()) {
      dayPrompt += `\n\nInstrucao adicional do consultor: ${instruction.trim().slice(0, 500)}`;
    }

    const dayGeneration = await this.generateDayWithRecovery(input, dayPlan, dayPrompt, ruleCtx.blockedTypes);

    this.logger.log({
      stage: 'day',
      tripId: input.tripId,
      agencyId: input.agencyId,
      userId: context?.userId || this.logContext?.userId || 'system',
      provider: this.provider.name,
      model: this.provider.model,
      promptHash: hashPrompt(dayPrompt),
      promptSnapshot: { prompt: dayPrompt, instruction },
      responseSnapshot: dayGeneration.dayBlocks,
      tokensIn: dayGeneration.tokensIn,
      tokensOut: dayGeneration.tokensOut,
      latencyMs: dayGeneration.latencyMs,
      success: true,
      error: dayGeneration.recoveredFrom,
    });

    return {
      dayBlocks: dayGeneration.dayBlocks,
      meta: { model: this.provider.model, provider: this.provider.name },
    };
  }

  private async generatePlanWithRecovery(
    input: TripInput,
    totalDays: number,
    prompt: string
  ): Promise<{ plan: TripPlan; tokensIn: number; tokensOut: number; latencyMs: number; recoveredFrom?: string }> {
    const started = Date.now();

    try {
      const result = await this.provider.generate({
        system: SYSTEM_BASE,
        user: prompt,
        schema: TripPlanSchema,
      });

      return {
        plan: ensurePlanCompleteness(result.data as TripPlan, input, totalDays),
        tokensIn: result.usage.tokensIn,
        tokensOut: result.usage.tokensOut,
        latencyMs: result.latencyMs,
      };
    } catch (error) {
      const firstError = error instanceof Error ? error.message : String(error);
      const retryPrompt = `${prompt}\n\nSua resposta anterior veio parcial ou invalida. Corrija e retorne JSON completo. Erro observado: ${firstError.slice(0, 800)}`;

      try {
        const retry = await this.provider.generate({
          system: SYSTEM_BASE,
          user: retryPrompt,
          schema: TripPlanSchema,
        });

        return {
          plan: ensurePlanCompleteness(retry.data as TripPlan, input, totalDays),
          tokensIn: retry.usage.tokensIn,
          tokensOut: retry.usage.tokensOut,
          latencyMs: Date.now() - started,
          recoveredFrom: firstError,
        };
      } catch (retryError) {
        const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);

        return {
          plan: buildFallbackTripPlan(input, totalDays),
          tokensIn: 0,
          tokensOut: 0,
          latencyMs: Date.now() - started,
          recoveredFrom: `${firstError} | fallback aplicado apos nova falha: ${retryMessage}`,
        };
      }
    }
  }

  private async retrievePois(
    input: TripInput,
    dayPlan: TripPlan['days'][number],
    excludedPoiNames: string[] = []
  ) {
    if (!this.poiRetriever) return uncoveredPoiResult(dayPlan.destination);

    try {
      return await this.poiRetriever.retrieve({ input, dayPlan, limit: 16, excludedPoiNames });
    } catch (error) {
      console.warn('[ai] Recuperacao de POIs falhou; fallback seguro ativado.', error);
      return uncoveredPoiResult(dayPlan.destination);
    }
  }

  private async generateDayWithRecovery(
    input: TripInput,
    dayPlan: TripPlan['days'][number],
    prompt: string,
    blockedTypes: string[],
    previouslyUsedPlaceNames: string[] = [],
    diningCandidateNames: string[] = []
  ): Promise<{ dayBlocks: DayBlocks; tokensIn: number; tokensOut: number; latencyMs: number; recoveredFrom?: string }> {
    const started = Date.now();

    try {
      const result = await this.provider.generate({
        system: SYSTEM_BASE,
        user: prompt,
        schema: DayBlocksSchema,
      });

      const dayBlocks = ensureDayBlocksCompleteness(result.data as DayBlocks, input, dayPlan, blockedTypes);
      assertDiningDiversity(dayBlocks, previouslyUsedPlaceNames, diningCandidateNames);
      return {
        dayBlocks,
        tokensIn: result.usage.tokensIn,
        tokensOut: result.usage.tokensOut,
        latencyMs: result.latencyMs,
      };
    } catch (error) {
      const firstError = error instanceof Error ? error.message : String(error);
      const retryPrompt = `${prompt}\n\nSua resposta anterior veio parcial ou invalida. Corrija e retorne JSON completo, mantendo o dia ${dayPlan.day}. Erro observado: ${firstError.slice(0, 800)}`;

      try {
        const retry = await this.provider.generate({
          system: SYSTEM_BASE,
          user: retryPrompt,
          schema: DayBlocksSchema,
        });

        const dayBlocks = ensureDayBlocksCompleteness(retry.data as DayBlocks, input, dayPlan, blockedTypes);
        assertDiningDiversity(dayBlocks, previouslyUsedPlaceNames, diningCandidateNames);
        return {
          dayBlocks,
          tokensIn: retry.usage.tokensIn,
          tokensOut: retry.usage.tokensOut,
          latencyMs: Date.now() - started,
          recoveredFrom: firstError,
        };
      } catch (retryError) {
        const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);

        return {
          dayBlocks: buildFallbackDayBlocks(input, dayPlan, `${firstError} | ${retryMessage}`),
          tokensIn: 0,
          tokensOut: 0,
          latencyMs: Date.now() - started,
          recoveredFrom: `${firstError} | fallback aplicado apos nova falha: ${retryMessage}`,
        };
      }
    }
  }
}

export function createAiOrchestrator(
  config?: Partial<AiOrchestratorConfig>,
  logger?: GenerationLogger,
  logContext?: { userId: string },
  poiRetriever?: PoiRetriever
): AiOrchestrator {
  return new AiOrchestrator(config, logger, logContext, poiRetriever);
}

function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex').slice(0, 16);
}

function ensurePlanCompleteness(plan: TripPlan, input: TripInput, totalDays: number): TripPlan {
  const fallbackPlan = buildFallbackTripPlan(input, totalDays);

  return {
    tripDescription: {
      title: plan.tripDescription?.title || fallbackPlan.tripDescription.title,
      summary: plan.tripDescription?.summary || fallbackPlan.tripDescription.summary,
      highlights:
        plan.tripDescription?.highlights?.filter(Boolean).length
          ? plan.tripDescription.highlights.filter(Boolean)
          : fallbackPlan.tripDescription.highlights,
    },
    days: Array.from({ length: totalDays }, (_, index) => {
      const day = index + 1;
      const existing = plan.days.find((entry) => entry.day === day);
      const fallback = fallbackPlan.days[index];

      return {
        day,
        date: existing?.date || fallback.date,
        destination: existing?.destination || fallback.destination,
        theme: existing?.theme || fallback.theme,
        focus: existing?.focus?.length ? existing.focus : fallback.focus,
      };
    }),
  };
}

function ensureDayBlocksCompleteness(
  dayBlocks: DayBlocks,
  input: TripInput,
  dayPlan: TripPlan['days'][number],
  blockedTypes: string[]
): DayBlocks {
  const sanitizedBlocks = sanitizeAllowedBlocks(dayBlocks.blocks || [], blockedTypes).map((block, index) => ({
    ...block,
    title: block.title?.trim() || `Experiencia ${index + 1}`,
    details:
      block.details?.trim() ||
      `Atividade sugerida para ${dayPlan.destination}, com detalhes finos a confirmar pelo consultor.`,
    estimatedDurationMinutes: block.estimatedDurationMinutes || inferBlockDuration(block.type),
    recommendedStartTime: block.recommendedStartTime || inferBlockStartTime(index),
  }));

  if (sanitizedBlocks.length === 0) {
    return buildFallbackDayBlocks(input, dayPlan, 'Nenhum bloco valido retornado pela IA');
  }

  return {
    day: dayPlan.day,
    daySummary: {
      title: dayBlocks.daySummary?.title || `Dia ${dayPlan.day} - ${dayPlan.theme}`,
      subTitle: dayBlocks.daySummary?.subTitle || dayPlan.destination,
      details:
        dayBlocks.daySummary?.details ||
        `Dia estruturado em ${dayPlan.destination}, com foco em ${dayPlan.theme.toLowerCase()}.`,
      imageSearchQuery:
        dayBlocks.daySummary?.imageSearchQuery ||
        `${dayPlan.destination} ${dayPlan.theme}`.trim(),
    },
    blocks: sanitizedBlocks,
  };
}

function buildFallbackTripPlan(input: TripInput, totalDays: number): TripPlan {
  return {
    tripDescription: {
      title: input.title,
      summary: `Roteiro estruturado para ${input.clientName}, com foco em ${input.destinations.join(', ')} e ritmo realista de viagem.`,
      highlights: input.destinations.slice(0, 4),
    },
    days: Array.from({ length: totalDays }, (_, index) => {
      const day = index + 1;
      const date = addDaysIso(input.startDate, index);
      const destination = resolveDestinationForDate(input, date);

      return {
        day,
        date,
        destination,
        theme: `Exploracao organizada de ${destination}`,
        focus: [destination, 'ritmo equilibrado', 'experiencias reais'],
      };
    }),
  };
}

function buildFallbackDayBlocks(
  input: TripInput,
  dayPlan: TripPlan['days'][number],
  failureReason?: string
): DayBlocks {
  const destination = dayPlan.destination || resolveDestinationForDate(input, dayPlan.date);
  const hotelBase = input.accommodations?.find(
    (entry) => entry.destinationCity && destination.toLowerCase().includes(entry.destinationCity.toLowerCase())
  );

  return {
    day: dayPlan.day,
    daySummary: {
      title: `Dia ${dayPlan.day} - ${dayPlan.theme || destination}`,
      subTitle: destination,
      details: `Dia reconstruido automaticamente para evitar roteiro parcial. O consultor pode refinar nomes especificos e horarios finos.${failureReason ? ` Motivo tecnico: ${failureReason.slice(0, 180)}.` : ''}`,
      imageSearchQuery: destination,
    },
    blocks: [
      {
        type: 'text',
        title: hotelBase?.name ? `Saida de ${hotelBase.name}` : `Inicio do dia em ${destination}`,
        subTitle: 'Base do roteiro',
        details: 'Comece o dia organizando deslocamentos, ingressos e prioridades da regiao escolhida. Use este bloco como ancora operacional antes de sair.',
        estimatedDurationMinutes: 45,
        recommendedStartTime: '08:00',
        imageSearchQuery: destination,
      },
      {
        type: 'places',
        title: dayPlan.theme || `Exploracao de ${destination}`,
        subTitle: 'Circuito principal',
        details: `Percorra os pontos principais de ${destination} mantendo foco em proximidade geografica e pausas realistas. Ajuste os POIs finais conforme disponibilidade confirmada pelo consultor.`,
        estimatedDurationMinutes: 180,
        recommendedStartTime: '09:00',
        imageSearchQuery: destination,
      },
      {
        type: 'text',
        title: `Almoco recomendado em ${destination}`,
        subTitle: 'Pausa funcional',
        details: 'Escolha um restaurante real proximo ao circuito do dia, priorizando avaliacao recente, perfil do cliente e facilidade logistica. Confirmar funcionamento e reserva antes de usar nome proprio.',
        estimatedDurationMinutes: 90,
        recommendedStartTime: '12:30',
        imageSearchQuery: `${destination} restaurant`,
      },
      {
        type: 'activity',
        title: `Tarde livre orientada em ${destination}`,
        subTitle: 'Exploracao complementar',
        details: 'Use a tarde para complementar o eixo do dia com compras, mirantes, museus ou caminhada curta, sem depender de deslocamentos longos entre bairros.',
        estimatedDurationMinutes: 180,
        recommendedStartTime: '14:30',
        imageSearchQuery: destination,
      },
      {
        type: 'text',
        title: hotelBase?.name ? `Retorno para ${hotelBase.name}` : `Encerramento do dia em ${destination}`,
        subTitle: 'Fechamento',
        details: 'Finalize o dia com retorno organizado, tempo para descanso e preparacao do proximo deslocamento ou jantar.',
        estimatedDurationMinutes: 60,
        recommendedStartTime: '18:30',
        imageSearchQuery: `${destination} night`,
      },
    ],
  };
}

function resolveDestinationForDate(input: TripInput, date: string): string {
  const detailed = input.destinationsDetail?.find(
    (entry) => entry.startDate && entry.endDate && date >= entry.startDate && date <= entry.endDate
  );

  return detailed?.city || input.destinations[0] || 'Destino';
}

function addDaysIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizePlaceName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isDiningBlock(block: DayBlocks['blocks'][number]) {
  const content = normalizePlaceName(`${block.title} ${block.subTitle || ''} ${block.details || ''}`);
  return /\b(almoco|jantar|restaurant|restaurante|cafe|bar|gastronomi|comida|culinari|refeicao)\b/.test(content);
}

function blockPlaceName(block: DayBlocks['blocks'][number]) {
  return block.location?.name?.trim() || block.title.trim();
}

function isGenericDiningTitle(value: string) {
  return /^(almoco|jantar|cafe da manha|pausa|refeicao|experiencia gastronomica)\b/.test(normalizePlaceName(value));
}

export function collectUsedDiningPlaceNames(dayBlocks: DayBlocks, diningCandidateNames: string[]) {
  const serialized = normalizePlaceName(JSON.stringify(dayBlocks));
  const used = diningCandidateNames.filter((name) => serialized.includes(normalizePlaceName(name)));

  for (const block of dayBlocks.blocks) {
    if (!isDiningBlock(block)) continue;
    const name = blockPlaceName(block);
    if (name && !isGenericDiningTitle(name)) used.push(name);
  }

  return Array.from(new Map(used.map((name) => [normalizePlaceName(name), name])).values());
}

export function assertDiningDiversity(
  dayBlocks: DayBlocks,
  previouslyUsedPlaceNames: string[],
  diningCandidateNames: string[]
) {
  const forbidden = previouslyUsedPlaceNames
    .map((name) => ({ name, normalized: normalizePlaceName(name) }))
    .filter(({ normalized }) => normalized.length >= 4);

  for (const block of dayBlocks.blocks) {
    if (!isDiningBlock(block)) continue;
    const current = normalizePlaceName(blockPlaceName(block));
    const repeated = forbidden.find(
      ({ normalized }) => current === normalized || current.includes(normalized) || normalized.includes(current)
    );
    if (repeated) {
      throw new Error(`Estabelecimento repetido de outro dia: ${repeated.name}. Escolha outro restaurante real.`);
    }
  }

  for (const candidateName of diningCandidateNames) {
    const normalizedCandidate = normalizePlaceName(candidateName);
    const occurrences = dayBlocks.blocks.filter((block) => {
      if (!isDiningBlock(block)) return false;
      const content = normalizePlaceName(`${block.title} ${block.location?.name || ''}`);
      return content.includes(normalizedCandidate);
    }).length;
    if (occurrences > 1) {
      throw new Error(`Estabelecimento repetido no mesmo dia: ${candidateName}. Varie almoco e jantar.`);
    }
  }
}

function inferBlockDuration(type: DayBlocks['blocks'][number]['type']): number {
  switch (type) {
    case 'transport':
      return 45;
    case 'text':
      return 30;
    case 'suggested_places':
      return 60;
    default:
      return 90;
  }
}

function inferBlockStartTime(index: number): string {
  const hour = Math.min(21, 9 + index * 2);
  return `${String(hour).padStart(2, '0')}:00`;
}

export { mergeDayIntoItinerary };
