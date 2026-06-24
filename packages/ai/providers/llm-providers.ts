import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { ZodSchema } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { LLMGenerateParams, LLMGenerateResult, LLMProvider } from './types';
import { extractJsonFromText } from './types';

const MAX_RETRIES = 2;

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  private client: Anthropic;

  constructor(
    readonly model: string,
    apiKey: string,
    private temperature = 0.4,
    private maxTokens = 4096
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async generate<T>(params: LLMGenerateParams<T>): Promise<LLMGenerateResult<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const started = Date.now();
      try {
        const schemaHint = JSON.stringify(zodToJsonSchema(params.schema, 'schema'));

        const response = await this.client.messages.create({
          model: this.model,
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          system: `${params.system}\n\nO JSON deve obedecer este schema:\n${schemaHint}`,
          messages: [{ role: 'user', content: params.user }],
        });

        const textBlock = response.content.find((block) => block.type === 'text');
        if (!textBlock || textBlock.type !== 'text') {
          throw new Error('Resposta vazia do Anthropic');
        }

        const parsed = extractJsonFromText(textBlock.text);
        const data = params.schema.parse(parsed);

        return {
          data,
          usage: {
            tokensIn: response.usage.input_tokens,
            tokensOut: response.usage.output_tokens,
          },
          latencyMs: Date.now() - started,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError ?? new Error('Falha ao gerar resposta com Anthropic');
  }
}

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  private client: OpenAI;

  constructor(
    readonly model: string,
    apiKey: string,
    private temperature = 0.4,
    private maxTokens = 4096
  ) {
    this.client = new OpenAI({ apiKey });
  }

  async generate<T>(params: LLMGenerateParams<T>): Promise<LLMGenerateResult<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const started = Date.now();
      try {
        const response = await this.client.chat.completions.create({
          model: this.model,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: params.system },
            { role: 'user', content: params.user },
          ],
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('Resposta vazia do OpenAI');

        const parsed = extractJsonFromText(content);
        const data = params.schema.parse(parsed);

        return {
          data,
          usage: {
            tokensIn: response.usage?.prompt_tokens ?? 0,
            tokensOut: response.usage?.completion_tokens ?? 0,
          },
          latencyMs: Date.now() - started,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError ?? new Error('Falha ao gerar resposta com OpenAI');
  }
}
