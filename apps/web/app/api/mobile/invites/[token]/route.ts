import { NextResponse } from 'next/server';
import { db } from '@rumo/db';
import { getAgencyById } from '../../../../../lib/server-account-store';
import { findTripById } from '../../../../../lib/server-trip-store';

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const resolvedParams = await params;
    const invite = db.travelerInvites.findByToken(resolvedParams.token);
    if (!invite || invite.status !== 'active' || new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Convite invalido ou expirado' }, { status: 404 });
    }

    const trip = await findTripById(invite.tripId, invite.agencyId);
    if (!trip || trip.agencyId !== invite.agencyId) {
      return NextResponse.json({ error: 'Viagem nao encontrada' }, { status: 404 });
    }

    const agency = await getAgencyById(trip.agencyId);
    if (!agency) {
      return NextResponse.json({ error: 'Agencia nao encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      invite: {
        id: invite.id,
        travelerName: invite.travelerName,
        email: invite.email,
        phone: invite.phone,
        expiresAt: invite.expiresAt,
      },
      agency: {
        id: agency.id,
        name: agency.name,
        logoUrl: agency.logoUrl,
        plan: agency.plan,
      },
      trip: {
        id: trip.id,
        title: trip.name,
        destination: trip.destinations?.join(', ') || '',
        origin: trip.origin || '',
        startDate: trip.startDate,
        endDate: trip.endDate,
        travelers: trip.travelers?.length || 1,
        status: trip.status,
        content: trip.itinerary || [],
        documents: trip.documents || [],
        agencyId: trip.agencyId,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Erro ao abrir convite' }, { status: 500 });
  }
}
