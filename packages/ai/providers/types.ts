import type { ZodSchema } from 'zod';
import type { TokenUsage } from '../types';

export interface LLMGenerateParams<T> {
  system: string;
  user: string;
  schema: ZodSchema<T>;
  temperature?: number;
}

export interface LLMGenerateResult<T> {
  data: T;
  usage: TokenUsage;
  latencyMs: number;
}

export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  generate<T>(params: LLMGenerateParams<T>): Promise<LLMGenerateResult<T>>;
}

export function extractJsonFromText(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed);
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1].trim());
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }

  throw new Error('Resposta da IA não contém JSON válido');
}
