import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../lib/server-auth';
import { getTravelerTripAccess } from '../../../../../lib/server-traveler-access';
import { setTripVisibility } from '../../../../../lib/server-traveler-profile-store';

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    if (user.role !== 'traveler') {
      return NextResponse.json({ error: 'Area exclusiva para viajantes' }, { status: 403 });
    }

    const body = await request.json();
    const tripId = String(body.tripId || '');
    const isPublic = Boolean(body.isPublic);

    if (!tripId || !getTravelerTripAccess(user.id, tripId)) {
      return NextResponse.json({ error: 'Voce nao tem acesso a esta viagem' }, { status: 403 });
    }

    await setTripVisibility(user.id, tripId, isPublic);
    return NextResponse.json({ success: true, tripId, isPublic });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar a visibilidade';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
