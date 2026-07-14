'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

interface ItineraryItem {
  id: string;
  day: number;
  type: string;
  title: string;
  subTitle?: string;
  details?: string;
  image?: string;
  customSymbol?: string;
  meta?: Record<string, any>;
}

interface TripDocument {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
  size: number;
}

interface TravelerTrip {
  id: string;
  name: string;
  destinations?: string[];
  startDate: string;
  endDate: string;
  status: string;
  coverImage?: string;
  itinerary?: ItineraryItem[];
  agency?: {
    name: string;
    logoUrl?: string;
  } | null;
  documents?: TripDocument[];
}

const typeLabel = (type: string) => {
  const labels: Record<string, string> = {
    trip_desc: 'Descrição da viagem',
    day_summary: 'Resumo do dia',
    places: 'Lugar',
    activity: 'Passeio',
    transport: 'Deslocamento',
    text: 'Dica',
    suggested_places: 'Sugestão',
    flight: 'Voo',
    hotel: 'Hospedagem',
  };
  return labels[type] || 'Item';
};

const typeIcon = (item: ItineraryItem) => {
  if (item.customSymbol) return item.customSymbol;
  const icons: Record<string, string> = {
    trip_desc: 'description',
    day_summary: 'calendar_today',
    places: 'museum',
    activity: 'explore',
    transport: 'directions_car',
    text: 'notes',
    suggested_places: 'star',
    flight: 'flight',
    hotel: 'hotel',
  };
  return icons[item.type] || 'travel_explore';
};

const getTrailMode = (item: ItineraryItem) => {
  const mode = item.meta?.routeFromPrevious?.mode;
  return mode === 'car_or_transit' || item.type === 'transport' ? 'car' : 'walk';
};

const buildUberRideUrl = (item: ItineraryItem) => {
  if (getTrailMode(item) !== 'car') return '';
  const location = item.meta?.location;
  const hasCoordinates =
    typeof location?.latitude === 'number' && typeof location?.longitude === 'number';
  const addressLine1 = location?.name || item.meta?.originalTitle || item.title;
  const addressLine2 = location?.address || item.subTitle || '';

  if (!hasCoordinates && !addressLine1) return '';

  const dropoff = {
    ...(hasCoordinates ? { latitude: location.latitude, longitude: location.longitude } : {}),
    addressLine1,
    ...(addressLine2 ? { addressLine2 } : {}),
  };

  const params = new URLSearchParams({
    pickup: 'my_location',
    'drop[0]': JSON.stringify(dropoff),
  });
  const clientId = process.env.NEXT_PUBLIC_UBER_CLIENT_ID;
  if (clientId) params.set('client_id', clientId);
  return `https://m.uber.com/looking?${params.toString()}`;
};

export default function TravelerTripDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<TravelerTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [coverImageFailed, setCoverImageFailed] = useState(false);

  useEffect(() => {
    setCoverImageFailed(false);
  }, [trip?.coverImage]);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const response = await fetch(`/api/traveler/trips/${params.id}`);
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        if (response.status === 403) {
          router.push('/dashboard');
          return;
        }
        if (response.ok) {
          setTrip(await response.json());
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [params.id, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
          <p className="text-sm text-on-surface opacity-65 mt-3">Carregando trilha...</p>
        </div>
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center p-6">
        <section className="bg-white border border-outline-variant rounded-xl p-8 text-center max-w-md">
          <span className="material-symbols-outlined text-4xl text-primary">lock</span>
          <h1 className="font-headline-md text-xl font-black text-on-surface mt-3">Viagem nao encontrada</h1>
          <p className="text-sm text-on-surface opacity-70 mt-1">
            Esta viagem nao esta liberada no seu acesso.
          </p>
          <Link href="/app/trips" className="inline-flex mt-5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary">
            Voltar
          </Link>
        </section>
      </main>
    );
  }

  const items = trip.itinerary || [];
  const days = Array.from(new Set(items.map((item) => item.day))).sort((a, b) => a - b);

  return (
    <main className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur border-b border-outline-variant">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <Link href="/app/trips" className="inline-flex items-center gap-2 text-xs font-bold text-primary">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Minhas viagens
          </Link>
          <Link href="/logout" className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-xs font-bold hover:bg-surface-container-low">
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Sair
          </Link>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-5 py-8">
        <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm mb-8">
          <div className="relative min-h-[280px] bg-surface-container-low">
            {trip.coverImage && !coverImageFailed ? (
              <img
                src={trip.coverImage}
                alt={trip.name}
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => setCoverImageFailed(true)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-primary bg-primary/5">
                <span className="material-symbols-outlined text-5xl">travel_explore</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            <div className="absolute left-6 right-6 bottom-6">
              <p className="text-[10px] font-black uppercase tracking-wider text-white/85">
                {trip.agency?.name || 'Agencia'}
              </p>
              <h1 className="font-headline-lg text-3xl font-black text-white mt-1">{trip.name}</h1>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-on-surface">
                  {trip.startDate} a {trip.endDate}
                </span>
                {trip.destinations?.map((destination) => (
                  <span key={destination} className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-on-primary">
                    {destination}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Trip Documents Section for Traveler */}
        {trip.documents && trip.documents.length > 0 && (
          <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm mb-8">
            <h3 className="font-headline-sm text-sm font-black text-primary uppercase tracking-wider">
              Documentos de Viagem
            </h3>
            <p className="text-[11px] text-on-surface opacity-75 mt-0.5 mb-4">
              Acesse as passagens, vouchers e documentos importantes anexados pela sua agência.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {trip.documents.map((doc) => (
                <a 
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border border-outline-variant hover:border-primary hover:bg-primary/5 transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl">
                      {doc.name.toLowerCase().endsWith('.pdf') ? 'picture_as_pdf' : 'description'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-on-surface truncate" title={doc.name}>
                      {doc.name}
                    </p>
                    <p className="text-[10px] text-on-surface opacity-60 mt-0.5">
                      {(doc.size / 1024).toFixed(0)} KB • Clique para abrir
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-base text-on-surface opacity-55">
                    open_in_new
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}


        <div className="space-y-10">
          {days.map((day) => {
            const dayItems = items.filter((item) => item.day === day);
            return (
              <section key={day} className="scroll-reveal relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center text-sm font-black shadow-sm">
                    {day}
                  </div>
                  <h2 className="font-headline-md text-xl font-black text-on-surface">Dia {day}</h2>
                </div>

                <div className="space-y-5">
                  {dayItems.map((item, index) => {
                    const uberUrl = buildUberRideUrl(item);
                    return (
                      <article key={item.id} className="scroll-reveal grid grid-cols-[56px_minmax(0,1fr)] gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 rounded-full bg-white border-2 border-primary/40 text-primary flex items-center justify-center shadow-sm">
                            <span className="material-symbols-outlined text-[24px]">{typeIcon(item)}</span>
                          </div>
                          {index < dayItems.length - 1 && (
                            <div className="flex-1 min-h-10 border-l-2 border-dotted border-outline-variant my-2" />
                          )}
                        </div>

                        <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <div className="p-5">
                            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 mb-3 text-primary">
                              <span className="material-symbols-outlined text-[16px]">{typeIcon(item)}</span>
                              <span className="text-[10px] font-black uppercase tracking-wider">{typeLabel(item.type)}</span>
                            </div>
                            <h3 className="font-headline-sm text-lg font-black text-on-surface">{item.title}</h3>
                            {item.subTitle && (
                              <p className="text-xs font-semibold text-on-surface opacity-70 mt-1">{item.subTitle}</p>
                            )}
                            {item.details && (
                              <p className="whitespace-pre-line text-sm text-on-surface opacity-80 leading-relaxed mt-3">
                                {item.details}
                              </p>
                            )}
                            {uberUrl && (
                              <a
                                href={uberUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 inline-flex items-center gap-2 rounded-full bg-black px-3.5 py-2 text-[11px] font-black text-white shadow-sm hover:shadow-md"
                              >
                                <span className="material-symbols-outlined text-[16px]">local_taxi</span>
                                Abrir no Uber
                              </a>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}
