import { NextResponse } from 'next/server';
import { db } from '@rumo/db';
import { getCurrentUser } from '../../../../lib/server-auth';
import { createTripAiOrchestrator } from '../../../../lib/ai/create-orchestrator';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const settings = db.settings.get(user.agencyId);
    const provider = process.env.LLM_PROVIDER || 'gemini';
    const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY || settings.claudeKey);
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || settings.geminiKey);
    const orchestrator = createTripAiOrchestrator(user.agencyId, user.id);

    return NextResponse.json({
      ok: true,
      provider: orchestrator.providerName,
      model: orchestrator.modelName,
      configured:
        provider === 'mock' ||
        (provider === 'anthropic' && hasAnthropicKey) ||
        (provider === 'gemini' && hasGeminiKey) ||
        (provider === 'openai' && Boolean(process.env.OPENAI_API_KEY)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao verificar IA';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
