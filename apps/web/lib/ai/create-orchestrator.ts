import { db } from '@rumo/db';
import {
  createAiOrchestrator,
  type AiOrchestratorConfig,
  type GenerationLogger,
} from '@rumo/ai';

export function createTripAiOrchestrator(
  agencyId: string,
  userId: string,
  overrides?: Partial<AiOrchestratorConfig>
) {
  const settings = db.settings.get(agencyId);
  const provider = overrides?.provider || process.env.LLM_PROVIDER || 'mock';
  const apiKey =
    overrides?.apiKey ||
    (provider === 'anthropic'
      ? process.env.ANTHROPIC_API_KEY || settings.claudeKey
      : process.env.OPENAI_API_KEY || '');

  const logger: GenerationLogger = {
    log: (entry) => {
      db.aiGenerations.create(entry);
    },
  };

  return createAiOrchestrator(
    {
      provider,
      model: overrides?.model || process.env.LLM_MODEL,
      apiKey: apiKey || undefined,
      temperature: overrides?.temperature,
      maxTokens: overrides?.maxTokens,
    },
    logger,
    { userId }
  );
}
