import type { AiOrchestratorConfig } from '../types';
import { AnthropicProvider, GeminiProvider, OpenAIProvider } from './llm-providers';
import { MockProvider } from './mock.provider';
import type { LLMProvider } from './types';

export function createLLMProvider(config: AiOrchestratorConfig): LLMProvider {
  const temperature = config.temperature ?? 0.4;
  const maxTokens = config.maxTokens ?? 4096;
  const provider = (config.provider || 'gemini').toLowerCase();

  if (provider === 'mock') {
    // Sempre reporta um nome de modelo falso: senao o log de geracao registra
    // "gemini-2.5-flash" (LLM_MODEL) para um roteiro que nenhuma IA escreveu.
    return new MockProvider('mock-itinerary-v1');
  }

  if (provider === 'anthropic') {
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Chave da Anthropic ausente. Cole a chave em Configuracoes > Inteligencia artificial ou defina ANTHROPIC_API_KEY no ambiente.'
      );
    }
    return new AnthropicProvider(
      config.model || 'claude-sonnet-4-20250514',
      apiKey,
      temperature,
      maxTokens
    );
  }

  if (provider === 'openai') {
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Chave da OpenAI ausente. Cole a chave em Configuracoes > Inteligencia artificial ou defina OPENAI_API_KEY no ambiente.'
      );
    }
    return new OpenAIProvider(
      config.model || 'gpt-4o',
      apiKey,
      temperature,
      maxTokens
    );
  }

  if (provider === 'gemini') {
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Chave do Gemini ausente. Cole a chave em Configuracoes > Inteligencia artificial ou defina GEMINI_API_KEY no ambiente.'
      );
    }
    return new GeminiProvider(
      config.model || 'gemini-2.5-flash',
      apiKey,
      temperature,
      maxTokens,
      config.fallbackModels || parseFallbackModels(process.env.GEMINI_FALLBACK_MODELS)
    );
  }

  throw new Error(`LLM_PROVIDER desconhecido: ${provider}`);
}

export function resolveOrchestratorConfig(
  overrides?: Partial<AiOrchestratorConfig>
): AiOrchestratorConfig {
  return {
    provider: overrides?.provider || process.env.LLM_PROVIDER || 'gemini',
    model: overrides?.model || process.env.LLM_MODEL || 'gemini-2.5-flash',
    fallbackModels:
      overrides?.fallbackModels || parseFallbackModels(process.env.GEMINI_FALLBACK_MODELS),
    apiKey: overrides?.apiKey,
    temperature: overrides?.temperature ?? Number(process.env.LLM_TEMPERATURE || 0.4),
    maxTokens: overrides?.maxTokens ?? Number(process.env.LLM_MAX_TOKENS || 4096),
  };
}

function parseFallbackModels(value?: string): string[] | undefined {
  const models = value
    ?.split(',')
    .map((model) => model.trim())
    .filter(Boolean);

  return models?.length ? models : undefined;
}
