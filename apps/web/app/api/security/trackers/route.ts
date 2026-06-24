import { NextResponse } from 'next/server';
import { db } from '@rumo/db';
import { getCurrentUser } from '../../../../lib/server-auth';

const statuses = ['Voo', 'Hotel', 'Atividade', 'Offline'] as const;

interface ItineraryItem {
  day?: number;
  type?: string;
  title?: string;
  subTitle?: string;
}

interface TripRecord {
  id: string;
  name: string;
  clientName: string;
  travelers?: string[];
  destinations?: string[];
  itinerary?: ItineraryItem[];
}

interface ClientRecord {
  fullName: string;
  phone?: string;
}

const getLatestLocation = (trip: TripRecord) => {
  const item = [...(trip.itinerary || [])].sort((a, b) => (b.day || 0) - (a.day || 0))[0];
  if (!item) return trip.destinations?.[0] || 'Local nao informado';

  if (item.type === 'flight') {
    return `${item.title}${item.subTitle ? ` (${item.subTitle})` : ''}`;
  }

  return item.subTitle || item.title || trip.destinations?.[0] || 'Local nao informado';
};

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    const trips = db.trips.findMany(user.agencyId) as TripRecord[];
    const clients = db.clients.findMany(user.agencyId) as ClientRecord[];

    const trackers = trips.flatMap((trip, tripIndex) => {
      const client = clients.find((c) => c.fullName === trip.clientName);
      const travelers = trip.travelers?.length ? trip.travelers : [trip.clientName || 'Viajante'];

      return travelers.map((traveler: string, travelerIndex: number) => {
        const status = statuses[(tripIndex + travelerIndex) % statuses.length];
        return {
          id: `${trip.id}-${travelerIndex}`,
          name: travelerIndex === 0 ? trip.clientName : `Viajante ${travelerIndex + 1}`,
          initials: traveler,
          tripName: trip.name,
          status,
          locationName: status === 'Offline' ? `${trip.destinations?.[0] || 'Destino'} (ultimo sinal)` : getLatestLocation(trip),
          coords: {
            x: 20 + ((tripIndex * 17 + travelerIndex * 9) % 62),
            y: 24 + ((tripIndex * 13 + travelerIndex * 11) % 56),
          },
          battery: Math.max(12, 96 - tripIndex * 9 - travelerIndex * 7),
          lastUpdate: status === 'Offline' ? 'Sem sinal recente' : 'Atualizado agora',
          phone: client?.phone || '',
        };
      });
    });

    return NextResponse.json(trackers);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar rastreadores' }, { status: 500 });
  }
}
