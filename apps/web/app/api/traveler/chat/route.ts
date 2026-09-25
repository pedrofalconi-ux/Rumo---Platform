import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/server-auth';
import { getTravelerTripAccess } from '../../../../lib/server-traveler-access';
import { createChatMessage, listChatMessages } from '../../../../lib/server-chat-store';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    if (user.role !== 'traveler') {
      return NextResponse.json({ error: 'Area exclusiva para viajantes' }, { status: 403 });
    }

    const tripId = new URL(request.url).searchParams.get('tripId') || '';
    if (!tripId) return NextResponse.json({ error: 'Informe a viagem' }, { status: 400 });
    if (!getTravelerTripAccess(user.id, tripId)) {
      return NextResponse.json({ error: 'Voce nao tem acesso a esta viagem' }, { status: 403 });
    }

    const messages = await listChatMessages(tripId);
    return NextResponse.json(messages);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar mensagens';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    if (user.role !== 'traveler') {
      return NextResponse.json({ error: 'Area exclusiva para viajantes' }, { status: 403 });
    }

    const body = await request.json();
    const tripId = String(body.tripId || '');
    const text = String(body.text || '').trim();

    const access = tripId ? getTravelerTripAccess(user.id, tripId) : null;
    if (!access) {
      return NextResponse.json({ error: 'Voce nao tem acesso a esta viagem' }, { status: 403 });
    }
    if (!text) {
      return NextResponse.json({ error: 'Escreva uma mensagem' }, { status: 400 });
    }

    const message = await createChatMessage({
      tripId,
      agencyId: access.agencyId,
      senderId: user.id,
      senderName: user.fullName || 'Voce',
      senderRole: 'traveler',
      text,
    });
    return NextResponse.json(message);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao enviar a mensagem';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
