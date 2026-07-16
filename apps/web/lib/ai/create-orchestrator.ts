import { createClient } from '@supabase/supabase-js';
import {
  createAiOrchestrator,
  type AiOrchestratorConfig,
  type GenerationLogger,
} from '@rumo/ai';
import { db } from '@rumo/db';
import { getAgencySettings } from '../server-account-store';
import { supabasePoiRetriever } from '../server-poi-store';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const hasSupabaseServerAccess = Boolean(supabaseUrl && supabaseServiceRoleKey);
const SUPABASE_SERVER_TIMEOUT_MS = 5000;

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_SERVER_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

const supabaseAdmin = hasSupabaseServerAccess
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: fetchWithTimeout,
      },
    })
  : null;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function resolveProvider(
  requestedProvider: string | undefined,
  settings: Awaited<ReturnType<typeof getAgencySettings>>
) {
  const provider = String(requestedProvider || process.env.LLM_PROVIDER || 'gemini').toLowerCase();
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || settings.geminiKey);
  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY);
  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY || settings.claudeKey);

  if (process.env.NODE_ENV === 'production' && provider === 'mock') {
    if (hasGeminiKey) return 'gemini';
    if (hasOpenAiKey) return 'openai';
    if (hasAnthropicKey) return 'anthropic';
  }

  return provider;
}

async function persistGenerationLog(entry: Parameters<GenerationLogger['log']>[0]) {
  if (supabaseAdmin && isUuid(entry.agencyId)) {
    const { error } = await supabaseAdmin.from('ai_generations').insert({
      agency_id: entry.agencyId,
      trip_id: isUuid(entry.tripId) ? entry.tripId : null,
      user_id: isUuid(entry.userId) ? entry.userId : null,
      provider: entry.provider || null,
      model: entry.model || null,
      input: entry.promptSnapshot || null,
      output: entry.responseSnapshot || null,
      metadata: {
        stage: entry.stage,
        promptHash: entry.promptHash,
        tokensIn: entry.tokensIn,
        tokensOut: entry.tokensOut,
        latencyMs: entry.latencyMs,
        success: entry.success,
        error: entry.error || null,
      },
    });

    if (!error) {
      return;
    }

    console.warn('[ai] Falha ao persistir log no Supabase:', error.message);
  }

  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    try {
      db.aiGenerations.create(entry);
    } catch (error) {
      console.warn('[ai] Falha ao persistir log local:', error);
    }
  }
}

export async function createTripAiOrchestrator(
  agencyId: string,
  userId: string,
  overrides?: Partial<AiOrchestratorConfig>
) {
  const settings = await getAgencySettings(agencyId);
  const provider = resolveProvider(overrides?.provider, settings);
  const apiKey =
    overrides?.apiKey ||
    (provider === 'anthropic'
      ? process.env.ANTHROPIC_API_KEY || settings.claudeKey
      : provider === 'gemini'
        ? process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || settings.geminiKey || ''
        : provider === 'openai'
          ? process.env.OPENAI_API_KEY || ''
          : '');

  const logger: GenerationLogger = {
    log: (entry) => {
      void persistGenerationLog(entry);
    },
  };

  return createAiOrchestrator(
    {
      provider,
      model: overrides?.model || process.env.LLM_MODEL,
      fallbackModels: overrides?.fallbackModels,
      apiKey: apiKey || undefined,
      temperature: overrides?.temperature,
      maxTokens: overrides?.maxTokens,
    },
    logger,
    { userId },
    supabasePoiRetriever
  );
}
