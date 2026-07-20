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
  meta?: Record<string, unknown> & {
    routeFromPrevious?: { mode?: string };
    location?: { latitude?: number; longitude?: number; name?: string; address?: string };
    originalTitle?: string;
  };
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

const formatTripDate = (value: string) => {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
    .format(date)
    .replace('.', '');
};

const formatDayDate = (startDate: string, day: number) => {
  const date = new Date(`${startDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + day - 1);
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(date);
};

export default function TravelerTripDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<TravelerTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [failedCoverImage, setFailedCoverImage] = useState<string | null>(null);

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

      <section className="max-w-5xl mx-auto px-4 sm:px-5 py-5 sm:py-8">
        <div className="bg-white border border-outline-variant rounded-[1.75rem] overflow-hidden shadow-sm mb-6 sm:mb-8">
          <div className="relative min-h-[320px] sm:min-h-[360px] bg-surface-container-low">
            {trip.coverImage && trip.coverImage !== failedCoverImage ? (
              <img
                src={trip.coverImage}
                alt={trip.name}
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => setFailedCoverImage(trip.coverImage || null)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-primary bg-primary/5">
                <span className="material-symbols-outlined text-5xl">travel_explore</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/5" />
            <div className="absolute left-5 right-5 sm:left-8 sm:right-8 bottom-6 sm:bottom-8">
              <p className="text-[10px] font-black uppercase tracking-wider text-white/85">
                {trip.agency?.name || 'Agencia'}
              </p>
              <h1 className="font-headline-lg text-3xl sm:text-4xl font-black text-white mt-1 max-w-2xl leading-tight">{trip.name}</h1>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-on-surface">
                  {formatTripDate(trip.startDate)} — {formatTripDate(trip.endDate)}
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

        <section className="relative overflow-hidden rounded-[1.5rem] border border-primary/15 bg-gradient-to-br from-primary/10 via-white to-surface-container-low p-5 sm:p-6 mb-8">
          <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full border-[26px] border-primary/5" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-sm">
                <span className="material-symbols-outlined text-[26px]">route</span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Sua trilha de viagem</p>
                <h2 className="font-headline-md text-xl font-black text-on-surface mt-0.5">
                  {days.length} {days.length === 1 ? 'dia' : 'dias'} para viver no seu ritmo
                </h2>
                <p className="text-xs text-on-surface/65 mt-1">Siga o percurso abaixo, uma parada de cada vez.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <div className="rounded-xl bg-white/80 border border-white px-4 py-2.5 shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-wider text-on-surface/50">Paradas</p>
                <p className="text-lg font-black text-primary leading-none mt-1">{items.length}</p>
              </div>
              <div className="rounded-xl bg-white/80 border border-white px-4 py-2.5 shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-wider text-on-surface/50">Destino</p>
                <p className="max-w-[130px] truncate text-xs font-black text-on-surface mt-1">{trip.destinations?.[0] || 'Sua viagem'}</p>
              </div>
            </div>
          </div>
          {days.length > 0 && (
            <nav aria-label="Atalhos para os dias" className="relative mt-5 flex gap-2 overflow-x-auto pb-1">
              {days.map((day) => (
                <a key={day} href={`#dia-${day}`} className="shrink-0 rounded-full border border-primary/15 bg-white/80 px-3 py-1.5 text-[11px] font-bold text-primary transition hover:bg-primary hover:text-on-primary">
                  Dia {day}
                </a>
              ))}
            </nav>
          )}
        </section>

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


        <div className="relative pb-4">
          {days.length > 0 && (
            <div aria-hidden="true" className="absolute left-[23px] sm:left-[31px] top-7 bottom-7 w-[3px] rounded-full bg-gradient-to-b from-primary via-primary/45 to-primary/10" />
          )}
          {days.map((day) => {
            const dayItems = items.filter((item) => item.day === day);
            return (
              <section id={`dia-${day}`} key={day} className="scroll-reveal relative pb-12 last:pb-0 scroll-mt-24">
                <div className="relative flex items-center gap-4 mb-6">
                  <div className="z-10 w-12 h-12 sm:w-16 sm:h-16 rounded-[1.15rem] bg-primary text-on-primary flex flex-col items-center justify-center shadow-lg shadow-primary/20 ring-4 ring-surface">
                    <span className="text-[8px] font-black uppercase tracking-wider opacity-75">Dia</span>
                    <span className="text-lg sm:text-xl font-black leading-none">{day}</span>
                  </div>
                  <div>
                    <h2 className="font-headline-md text-xl sm:text-2xl font-black text-on-surface">Dia {day}</h2>
                    <p className="text-xs capitalize text-on-surface/60 mt-0.5">{formatDayDate(trip.startDate, day)}</p>
                  </div>
                  <div className="ml-auto hidden sm:flex items-center gap-1.5 rounded-full bg-primary/5 px-3 py-1.5 text-[10px] font-bold text-primary">
                    <span className="material-symbols-outlined text-[15px]">near_me</span>
                    {dayItems.length} {dayItems.length === 1 ? 'parada' : 'paradas'}
                  </div>
                </div>

                <div className="space-y-5 ml-2 sm:ml-4">
                  {dayItems.map((item, index) => {
                    const uberUrl = buildUberRideUrl(item);
                    return (
                      <article key={item.id} className="scroll-reveal group grid grid-cols-[32px_minmax(0,1fr)] sm:grid-cols-[48px_minmax(0,1fr)] gap-3 sm:gap-5">
                        <div className="flex flex-col items-center">
                          <div className="z-10 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-white border-[3px] border-primary/35 text-primary flex items-center justify-center shadow-sm transition group-hover:border-primary group-hover:scale-105">
                            <span className="material-symbols-outlined text-[17px] sm:text-[21px]">{typeIcon(item)}</span>
                          </div>
                          {index < dayItems.length - 1 && (
                            <div className="flex-1 min-h-8 border-l-2 border-dashed border-primary/25 my-1" />
                          )}
                        </div>

                        <div className="bg-white border border-outline-variant/80 rounded-[1.35rem] overflow-hidden shadow-sm transition duration-300 group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-md">
                          {item.image && (
                            <div className="relative h-44 sm:h-52 overflow-hidden">
                              <img
                                src={item.image}
                                alt={item.title}
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                                onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}
                              />
                              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent" />
                            </div>
                          )}
                          <div className="p-4 sm:p-5">
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
          {days.length > 0 ? (
            <div className="relative flex items-center gap-4">
              <div className="z-10 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-white border-4 border-primary text-primary shadow-md ring-4 ring-surface">
                <span className="material-symbols-outlined text-[24px] sm:text-[28px]">flag</span>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-primary">Chegada</p>
                <p className="font-headline-sm text-base font-black text-on-surface">Boas memórias pelo caminho</p>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-primary/25 bg-white p-10 text-center">
              <span className="material-symbols-outlined text-4xl text-primary/60">route</span>
              <h2 className="font-headline-sm text-lg font-black text-on-surface mt-3">Sua trilha está sendo preparada</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-on-surface/65">
                Assim que a agência liberar o roteiro, todas as paradas vão aparecer aqui.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
