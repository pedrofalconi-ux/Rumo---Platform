import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '../../../../../lib/server-auth';
import { createAgencyLlmProvider } from '../../../../../lib/ai/create-orchestrator';

export const ParsedFlightSchema = z.object({
  airline: z.string(),
  flightNumber: z.string(),
  origin: z.string(),
  destination: z.string(),
  departureTime: z.string(),
  arrivalTime: z.string(),
  duration: z.string(),
  title: z.string(),
  details: z.string().optional(),
});

function parseFlightLocally(text: string): z.infer<typeof ParsedFlightSchema> {
  const flightNumber = text.match(/\b([A-Z]{2,3})\s?-?\s?(\d{2,4})\b/i)?.slice(1).join('') || '';
  const airports = [...text.matchAll(/\b([A-Z]{3})\b/g)].map((match) => match[1]);
  const times = [...text.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)].map((match) => match[0]);
  const duration = text.match(/(?:dura(?:ç|c)ão(?: estimada)?(?: de)?|duration)\s*:?[ ]*([\dhm ]+)/i)?.[1]?.trim() || '';
  const airline = text.match(/(?:operado pela|companhia(?: aérea)?|airline)\s+([\p{L} .&-]+?)(?=\s+(?:partir|saindo|voo|flight|de\b)|[,.;])/iu)?.[1]?.trim() || '';
  const origin = airports[0] || '';
  const destination = airports[1] || '';
  return {
    airline,
    flightNumber,
    origin,
    destination,
    departureTime: times[0] || '',
    arrivalTime: times[1] || '',
    duration,
    title: flightNumber ? `Voo ${flightNumber}${destination ? ` para ${destination}` : ''}` : 'Voo',
    details: text.trim(),
  };
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (text.length < 12) {
      return NextResponse.json({ error: 'Cole os detalhes completos do bilhete.' }, { status: 400 });
    }

    const provider = await createAgencyLlmProvider(user.agencyId, { temperature: 0 });
    if (provider.name === 'mock') {
      return NextResponse.json({ flight: parseFlightLocally(text), provider: 'local' });
    }

    const result = await provider.generate({
      system: 'Você extrai dados objetivos de passagens aéreas. Não invente valores ausentes; use string vazia. Preserve códigos IATA e horários exatamente como aparecem.',
      user: `Extraia os dados deste bilhete ou confirmação de voo:\n\n${text}`,
      schema: ParsedFlightSchema as never,
      temperature: 0,
    });

    return NextResponse.json({ flight: result.data, provider: provider.name });
  } catch (error) {
    console.error('[ai/flight/parse]', error);
    return NextResponse.json({ error: 'Não foi possível analisar o bilhete agora.' }, { status: 500 });
  }
}
