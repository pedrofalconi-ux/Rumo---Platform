import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { ZodSchema } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { LLMGenerateParams, LLMGenerateResult, LLMProvider } from './types';
import { extractJsonFromText } from './types';

const MAX_RETRIES = 2;
const GEMINI_MAX_RETRIES = 3;

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

    for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt++) {
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

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  private models: string[];

  constructor(
    readonly model: string,
    private apiKey: string,
    private temperature = 0.4,
    private maxTokens = 4096,
    fallbackModels: string[] = ['gemini-2.5-flash-lite', 'gemini-1.5-flash']
  ) {
    this.models = [model, ...fallbackModels].filter(
      (candidate, index, models) => candidate && models.indexOf(candidate) === index
    );
  }

  async generate<T>(params: LLMGenerateParams<T>): Promise<LLMGenerateResult<T>> {
    let lastError: Error | null = null;
    const failures: string[] = [];

    for (const model of this.models) {
      for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt++) {
        const started = Date.now();
        try {
          const schemaHint = JSON.stringify(zodToJsonSchema(params.schema, 'schema'));
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
            model
          )}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: {
                parts: [
                  {
                    text: `${params.system}\n\nResponda somente com JSON valido. O JSON deve obedecer este schema:\n${schemaHint}`,
                  },
                ],
              },
              contents: [
                {
                  role: 'user',
                  parts: [{ text: params.user }],
                },
              ],
              generationConfig: {
                temperature: params.temperature ?? this.temperature,
                maxOutputTokens: this.maxTokens,
                responseMimeType: 'application/json',
              },
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            const error = new Error(
              `Falha Gemini ${response.status} (${model}): ${errorText.slice(0, 800)}`
            );

            if (shouldTryNextGeminiModel(response.status, errorText)) {
              lastError = error;
              failures.push(`${model}: ${summarizeGeminiError(response.status, errorText)}`);
              break;
            }

            if (response.status === 429 && attempt < GEMINI_MAX_RETRIES) {
              lastError = error;
              await delay(extractRetryDelayMs(errorText, response.headers.get('retry-after')));
              continue;
            }

            throw error;
          }

          const payload = (await response.json()) as GeminiResponse;
          const content = payload.candidates?.[0]?.content?.parts
            ?.map((part) => part.text || '')
            .join('')
            .trim();

          if (!content) throw new Error(`Resposta vazia do Gemini (${model})`);

          const parsed = extractJsonFromText(content);
          const data = params.schema.parse(parsed);

          return {
            data,
            usage: {
              tokensIn: payload.usageMetadata?.promptTokenCount ?? 0,
              tokensOut: payload.usageMetadata?.candidatesTokenCount ?? 0,
            },
            latencyMs: Date.now() - started,
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          if (attempt === GEMINI_MAX_RETRIES) {
            failures.push(`${model}: ${lastError.message.slice(0, 240)}`);
          }
        }
      }
    }

    throw new Error(
      `Falha ao gerar resposta com Gemini. Modelos tentados: ${this.models.join(', ')}. ${
        failures.length ? `Falhas: ${failures.join(' | ')}` : lastError?.message || ''
      }`
    );
  }
}

function shouldTryNextGeminiModel(status: number, errorText: string): boolean {
  if (status === 404 || status === 503) return true;
  if (status !== 429) return false;
  return /quota exceeded|resource_exhausted|free_tier_requests/i.test(errorText);
}

function summarizeGeminiError(status: number, errorText: string): string {
  const parsedMessage = errorText.match(/"message":\s*"([^"]+)"/)?.[1];
  return `HTTP ${status} ${parsedMessage || errorText.slice(0, 180)}`;
}

function extractRetryDelayMs(errorText: string, retryAfterHeader: string | null): number {
  const retryAfterSeconds = Number(retryAfterHeader);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, 60000);
  }

  const retryMatch = errorText.match(/retry in ([\d.]+)s/i);
  const retrySeconds = retryMatch ? Number(retryMatch[1]) : 15;
  return Math.min(Math.max(retrySeconds * 1000, 5000), 60000);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
