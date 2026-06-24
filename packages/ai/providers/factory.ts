import type { AiOrchestratorConfig } from '../types';
import { AnthropicProvider, OpenAIProvider } from './llm-providers';
import { MockProvider } from './mock.provider';
import type { LLMProvider } from './types';

export function createLLMProvider(config: AiOrchestratorConfig): LLMProvider {
  const temperature = config.temperature ?? 0.4;
  const maxTokens = config.maxTokens ?? 4096;
  const provider = (config.provider || 'mock').toLowerCase();

  if (provider === 'mock') {
    return new MockProvider(config.model || 'mock-itinerary-v1');
  }

  if (provider === 'anthropic') {
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new MockProvider('mock-fallback-no-key');
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
      return new MockProvider('mock-fallback-no-key');
    }
    return new OpenAIProvider(
      config.model || 'gpt-4o',
      apiKey,
      temperature,
      maxTokens
    );
  }

  return new MockProvider('mock-fallback-unknown-provider');
}

export function resolveOrchestratorConfig(
  overrides?: Partial<AiOrchestratorConfig>
): AiOrchestratorConfig {
  return {
    provider: overrides?.provider || process.env.LLM_PROVIDER || 'mock',
    model: overrides?.model || process.env.LLM_MODEL || 'claude-sonnet-4-20250514',
    apiKey: overrides?.apiKey,
    temperature: overrides?.temperature ?? Number(process.env.LLM_TEMPERATURE || 0.4),
    maxTokens: overrides?.maxTokens ?? Number(process.env.LLM_MAX_TOKENS || 4096),
  };
}
