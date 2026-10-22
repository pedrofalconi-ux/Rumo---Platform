import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '../../../../lib/server-auth';
import {
  createAgencyLlmProvider,
  describeAgencyAiEngine,
} from '../../../../lib/ai/create-orchestrator';

/**
 * Schema minusculo so para o probe: confirma que a chave autentica, que o modelo
 * responde e que o JSON estruturado volta parseavel — sem gastar um roteiro.
 */
const ProbeSchema = z.object({ ok: z.boolean() });

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const engine = await describeAgencyAiEngine(user.agencyId);
    const usingMock = engine.provider === 'mock';
    const configured = usingMock ? process.env.NODE_ENV !== 'production' : engine.hasApiKey;

    const body: Record<string, unknown> = {
      ok: true,
      provider: engine.provider,
      model: engine.model,
      configured,
      keySource: engine.keySource,
      usingMock,
    };

    // ?probe=1 faz uma chamada real e minima ao provider para validar a chave.
    if (request.nextUrl.searchParams.get('probe') && !usingMock) {
      if (!engine.hasApiKey) {
        body.probe = {
          ran: false,
          ok: false,
          error:
            'Nenhuma chave configurada para este provider. Cole a chave abaixo ou defina a variavel de ambiente.',
        };
      } else {
        const started = Date.now();
        try {
          const llm = await createAgencyLlmProvider(user.agencyId);
          const result = await llm.generate({
            system: 'Responda apenas com JSON valido.',
            user: 'Devolva exatamente {"ok": true}.',
            schema: ProbeSchema,
            temperature: 0,
          });
          body.probe = {
            ran: true,
            ok: result.data.ok === true,
            latencyMs: Date.now() - started,
            tokensIn: result.usage.tokensIn,
            tokensOut: result.usage.tokensOut,
          };
        } catch (error) {
          body.probe = {
            ran: true,
            ok: false,
            latencyMs: Date.now() - started,
            error: error instanceof Error ? error.message.slice(0, 500) : 'Erro desconhecido',
          };
        }
      }
    }

    return NextResponse.json(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao verificar IA';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
