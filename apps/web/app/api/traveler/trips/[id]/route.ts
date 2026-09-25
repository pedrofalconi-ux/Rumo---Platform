import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../lib/server-auth';
import { db } from '@rumo/db';
import { getAgencyById } from '../../../../../lib/server-account-store';
import { findTripById } from '../../../../../lib/server-trip-store';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    if (user.role !== 'traveler') {
      return NextResponse.json({ error: 'Area exclusiva para viajantes' }, { status: 403 });
    }

    const resolvedParams = await params;
    const access = db.travelerTrips.findAccessManyForUser(user.id).find((item: any) => item.tripId === resolvedParams.id);
    if (!access) {
      return NextResponse.json({ error: 'Viagem nao encontrada para este usuario' }, { status: 404 });
    }
    const trip = await findTripById(access.tripId, access.agencyId);
    if (!trip || trip.agencyId !== access.agencyId) {
      return NextResponse.json({ error: 'Viagem nao encontrada para este usuario' }, { status: 404 });
    }
    const agency = await getAgencyById(access.agencyId);
    return NextResponse.json({
      ...trip,
      agency: agency ? { id: agency.id, name: agency.name, logoUrl: agency.logoUrl, plan: agency.plan, themeId: (agency.settings as { appThemeId?: string } | undefined)?.appThemeId || 'rumo' } : null,
    });
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar viagem do viajante' }, { status: 500 });
  }
}
