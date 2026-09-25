import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/server-auth';
import { db } from '@rumo/db';
import { getAgencyById } from '../../../../lib/server-account-store';
import { findTripById } from '../../../../lib/server-trip-store';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    if (user.role !== 'traveler') {
      return NextResponse.json({ error: 'Area exclusiva para viajantes' }, { status: 403 });
    }

    const accessRows = db.travelerTrips.findAccessManyForUser(user.id);
    const trips = await Promise.all(accessRows.map(async (access: any) => {
      const trip = await findTripById(access.tripId, access.agencyId);
      if (!trip || trip.agencyId !== access.agencyId) return null;
      const agency = await getAgencyById(access.agencyId);
      return {
        ...trip,
        agency: agency ? { id: agency.id, name: agency.name, logoUrl: agency.logoUrl, plan: agency.plan } : null,
      };
    }));
    return NextResponse.json(trips.filter(Boolean));
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar viagens do viajante' }, { status: 500 });
  }
}
