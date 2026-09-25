import { NextResponse } from 'next/server';
import { db, normalizeTravelerInviteToken } from '@rumo/db';
import { findTripById } from '../../../../lib/server-trip-store';
import { provisionTravelerAccount } from '../../../../lib/server-account-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const normalizedToken = normalizeTravelerInviteToken(body.inviteToken || body.linkOrToken);
    const invite = normalizedToken ? db.travelerInvites.findByToken(normalizedToken) : null;
    if (!invite || invite.status !== 'active' || new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Cadastro de viajante exige um convite válido de uma agência' }, { status: 400 });
    }
    const trip = await findTripById(invite.tripId, invite.agencyId);
    if (!trip || trip.agencyId !== invite.agencyId) {
      return NextResponse.json({ error: 'A viagem vinculada ao convite não foi encontrada' }, { status: 404 });
    }
    const localUser = db.auth.registerTraveler({
      ...body,
      inviteToken: normalizedToken,
      linkOrToken: normalizedToken,
    });
    const user = await provisionTravelerAccount(localUser, body.password);
    const session = db.sessions.create(user.id);

    const response = NextResponse.json({
      user,
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
      },
    });
    response.cookies.set('rumo_session', session.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: new Date(session.expiresAt),
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao criar conta do viajante';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
