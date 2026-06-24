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
import { assertAllowedBlocks } from '../validators/block-registry';
import { createLLMProvider, resolveOrchestratorConfig } from '../providers/factory';
import type { LLMProvider } from '../providers/types';
import { composeItinerary, mergeDayIntoItinerary } from './compose-itinerary';
import { countTripDays, normalizeTripInput } from './trip-input-normalizer';

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
    private logContext?: { userId: string }
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
    context?: { userId?: string }
  ): Promise<GenerateResult> {
    const input = normalizeTripInput(rawInput);
    const ruleCtx = buildRuleContext(input);
    const totalDays = countTripDays(input.startDate, input.endDate);
    const generationId = randomUUID();
    const started = Date.now();

    let tokensIn = 0;
    let tokensOut = 0;

    const planPrompt = buildPlanTripPrompt(input, ruleCtx.constraints, totalDays);
    const planHash = hashPrompt(planPrompt);

    const planResult = await this.provider.generate({
      system: SYSTEM_BASE,
      user: planPrompt,
      schema: TripPlanSchema,
    });

    tokensIn += planResult.usage.tokensIn;
    tokensOut += planResult.usage.tokensOut;

    this.logger.log({
      stage: 'plan',
      tripId: input.tripId,
      agencyId: input.agencyId,
      userId: context?.userId || this.logContext?.userId || 'system',
      provider: this.provider.name,
      model: this.provider.model,
      promptHash: planHash,
      promptSnapshot: { prompt: planPrompt, input },
      responseSnapshot: planResult.data,
      tokensIn: planResult.usage.tokensIn,
      tokensOut: planResult.usage.tokensOut,
      latencyMs: planResult.latencyMs,
      success: true,
    });

    const plan = planResult.data as TripPlan;
    const dayResults: DayBlocks[] = [];

    for (const dayPlan of plan.days) {
      const dayPrompt = buildGenerateDayPrompt(input, dayPlan, ruleCtx.constraints);

      const dayResult = await this.provider.generate({
        system: SYSTEM_BASE,
        user: dayPrompt,
        schema: DayBlocksSchema,
      });

      assertAllowedBlocks(dayResult.data.blocks, ruleCtx.blockedTypes);
      dayResults.push(dayResult.data as DayBlocks);

      tokensIn += dayResult.usage.tokensIn;
      tokensOut += dayResult.usage.tokensOut;

      this.logger.log({
        stage: 'day',
        tripId: input.tripId,
        agencyId: input.agencyId,
        userId: context?.userId || this.logContext?.userId || 'system',
        provider: this.provider.name,
        model: this.provider.model,
        promptHash: hashPrompt(dayPrompt),
        promptSnapshot: { prompt: dayPrompt, day: dayPlan.day },
        responseSnapshot: dayResult.data,
        tokensIn: dayResult.usage.tokensIn,
        tokensOut: dayResult.usage.tokensOut,
        latencyMs: dayResult.latencyMs,
        success: true,
      });
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
      responseSnapshot: { itineraryCount: itinerary.length },
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
        daysGenerated: plan.days.length,
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
    const planResult = await this.provider.generate({
      system: SYSTEM_BASE,
      user: planPrompt,
      schema: TripPlanSchema,
    });

    const dayPlan = (planResult.data as TripPlan).days.find((d) => d.day === day);
    if (!dayPlan) {
      throw new Error(`Dia ${day} não encontrado no plano da viagem`);
    }

    let dayPrompt = buildGenerateDayPrompt(input, dayPlan, ruleCtx.constraints);
    if (instruction?.trim()) {
      dayPrompt += `\n\nInstrução adicional do consultor: ${instruction.trim().slice(0, 500)}`;
    }

    const dayResult = await this.provider.generate({
      system: SYSTEM_BASE,
      user: dayPrompt,
      schema: DayBlocksSchema,
    });

    assertAllowedBlocks(dayResult.data.blocks, ruleCtx.blockedTypes);

    this.logger.log({
      stage: 'day',
      tripId: input.tripId,
      agencyId: input.agencyId,
      userId: context?.userId || this.logContext?.userId || 'system',
      provider: this.provider.name,
      model: this.provider.model,
      promptHash: hashPrompt(dayPrompt),
      promptSnapshot: { prompt: dayPrompt, instruction },
      responseSnapshot: dayResult.data,
      tokensIn: dayResult.usage.tokensIn,
      tokensOut: dayResult.usage.tokensOut,
      latencyMs: dayResult.latencyMs,
      success: true,
    });

    return {
      dayBlocks: dayResult.data as DayBlocks,
      meta: { model: this.provider.model, provider: this.provider.name },
    };
  }
}

export function createAiOrchestrator(
  config?: Partial<AiOrchestratorConfig>,
  logger?: GenerationLogger,
  logContext?: { userId: string }
): AiOrchestrator {
  return new AiOrchestrator(config, logger, logContext);
}

function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex').slice(0, 16);
}

export { mergeDayIntoItinerary };
