import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/server-auth';
import { getTravelerTripAccess } from '../../../../lib/server-traveler-access';
import { createDiaryEntry, listDiaryEntries } from '../../../../lib/server-diary-store';

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

    const entries = await listDiaryEntries(user.id, tripId);
    return NextResponse.json(entries);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar o diario';
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

    const form = await request.formData();
    const tripId = String(form.get('tripId') || '');
    const title = String(form.get('title') || '').trim();
    const body = String(form.get('body') || '').trim();
    const day = Number(form.get('day') || 0);
    const photo = form.get('photo');

    if (!tripId || !getTravelerTripAccess(user.id, tripId)) {
      return NextResponse.json({ error: 'Voce nao tem acesso a esta viagem' }, { status: 403 });
    }
    if (!title || !body) {
      return NextResponse.json({ error: 'Preencha o titulo e o texto' }, { status: 400 });
    }
    if (!Number.isFinite(day) || day < 1) {
      return NextResponse.json({ error: 'Informe um numero de dia valido' }, { status: 400 });
    }

    const entry = await createDiaryEntry({
      userId: user.id,
      tripId,
      day,
      title,
      body,
      photoFile: photo instanceof File ? photo : null,
    });
    return NextResponse.json(entry);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao salvar a entrada do diario';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
