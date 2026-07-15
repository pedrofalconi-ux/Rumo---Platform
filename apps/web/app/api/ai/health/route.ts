import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/server-auth';
import { createTripAiOrchestrator } from '../../../../lib/ai/create-orchestrator';
import { getAgencySettings } from '../../../../lib/server-account-store';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const settings = await getAgencySettings(user.agencyId);
    const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY || settings.claudeKey);
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || settings.geminiKey);
    const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY);
    const orchestrator = await createTripAiOrchestrator(user.agencyId, user.id);
    const provider = orchestrator.providerName;

    return NextResponse.json({
      ok: true,
      provider: orchestrator.providerName,
      model: orchestrator.modelName,
      configured:
        (provider === 'mock' && process.env.NODE_ENV !== 'production') ||
        (provider === 'anthropic' && hasAnthropicKey) ||
        (provider === 'gemini' && hasGeminiKey) ||
        (provider === 'openai' && hasOpenAiKey),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao verificar IA';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
