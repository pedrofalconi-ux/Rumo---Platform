import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '../../../../../lib/server-auth';
import { createEconomyAgencyLlmProvider } from '../../../../../lib/ai/create-orchestrator';

const EnrichedPreferencesSchema = z.object({
  enrichedText: z.string().min(20).max(3000),
});

function localEnrichment(input: Record<string, unknown>) {
  const destinations = Array.isArray(input.destinations) ? input.destinations.filter(Boolean).join(', ') : '';
  const original = typeof input.preferences === 'string' ? input.preferences.trim() : '';
  const profile = typeof input.profile === 'string' ? input.profile : 'lazer';
  return [
    `Crie um roteiro de perfil ${profile}${destinations ? ` para ${destinations}` : ''}, com ritmo equilibrado e deslocamentos realistas.`,
    original ? `Prioridades informadas pelo consultor: ${original}` : '',
    'Respeite integralmente reservas, horários, restrições e endereços já cadastrados. Organize cada dia por proximidade geográfica, inclua pausas adequadas e apresente recomendações específicas, evitando descrições genéricas.',
  ].filter(Boolean).join('\n\n');
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const input = await request.json();
    const preferences = typeof input.preferences === 'string' ? input.preferences.slice(0, 2000) : '';
    const context = {
      title: String(input.title || '').slice(0, 200),
      origin: String(input.origin || '').slice(0, 150),
      destinations: Array.isArray(input.destinations) ? input.destinations.map(String).slice(0, 12) : [],
      period: String(input.period || '').slice(0, 100),
      travelers: Number(input.travelers) || 1,
      profile: String(input.profile || 'lazer').slice(0, 50),
      preferences,
      logistics: input.logistics && typeof input.logistics === 'object' ? input.logistics : {},
    };

    try {
      const provider = await createEconomyAgencyLlmProvider(user.agencyId);
      if (provider.name === 'mock') {
        return NextResponse.json({ enrichedText: localEnrichment(context), provider: 'local' });
      }
      const result = await provider.generate({
        system: `Você transforma anotações de um consultor de viagens em instruções claras para outra IA criar um roteiro. Preserve a intenção e todos os fatos fornecidos. Não invente preferências, reservas, necessidades ou horários. Escreva em português do Brasil, em 2 a 5 parágrafos objetivos. Inclua ritmo, prioridades, restrições, estilo de experiência e como usar a logística existente. Não escreva o roteiro; escreva apenas um briefing melhorado.`,
        user: `Enriqueça o briefing usando estes dados estruturados:\n${JSON.stringify(context, null, 2)}`,
        schema: EnrichedPreferencesSchema as never,
        temperature: 0.25,
      });

      const enriched = EnrichedPreferencesSchema.parse(result.data);
      return NextResponse.json({ enrichedText: enriched.enrichedText, provider: provider.name });
    } catch (providerError) {
      console.warn('[ai/preferences/enrich] Provider indisponível; usando enriquecimento local.', providerError);
      return NextResponse.json({
        enrichedText: localEnrichment(context),
        provider: 'local-fallback',
        degraded: true,
      });
    }
  } catch (error) {
    console.error('[ai/preferences/enrich]', error);
    return NextResponse.json({ error: 'Não foi possível enriquecer o texto agora.' }, { status: 500 });
  }
}
