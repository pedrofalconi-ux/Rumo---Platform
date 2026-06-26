'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';

interface TravelerTrip {
  id: string;
  name: string;
  destinations?: string[];
  startDate: string;
  endDate: string;
  status: string;
  coverImage?: string;
  itinerary?: Array<{ id: string; day: number }>;
  agency?: {
    name: string;
    logoUrl?: string;
  } | null;
}

function TravelerTripsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [trips, setTrips] = useState<TravelerTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [linkOrToken, setLinkOrToken] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/traveler/trips');
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      if (response.status === 403) {
        router.push('/dashboard');
        return;
      }
      if (response.ok) {
        setTrips(await response.json());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  useEffect(() => {
    const invite = searchParams.get('invite');
    if (invite) {
      setLinkOrToken(invite);
      setImportOpen(true);
    }
  }, [searchParams]);

  const handleImportTrip = async (event: React.FormEvent) => {
    event.preventDefault();
    setImporting(true);
    setError('');

    try {
      const response = await fetch('/api/traveler/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkOrToken }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Nao foi possivel importar esta viagem.');
        return;
      }

      setLinkOrToken('');
      setImportOpen(false);
      await fetchTrips();
    } catch {
      setError('Erro de conexao ao importar viagem.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur border-b border-outline-variant">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <Link href="/app/trips" className="flex items-center gap-3">
            <img src="/rumo-mark.svg" alt="Rumo" className="h-10 w-10 rounded-full shadow-sm" />
            <div>
              <p className="text-sm font-black text-primary leading-tight">Rumo</p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-on-surface opacity-60">Minhas viagens</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="btn-interactive inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary hover:opacity-95"
            >
              <span className="material-symbols-outlined text-[16px]">add_link</span>
              Importar viagem
            </button>
            <Link
              href="/logout"
              className="btn-interactive inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-xs font-bold text-on-surface hover:bg-surface-container-low"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              Sair
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-5 py-8">
        <div className="scroll-reveal mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-headline-lg text-3xl font-black text-on-surface">Suas trilhas de viagem</h1>
            <p className="text-sm text-on-surface opacity-70 mt-1">
              Roteiros liberados pelas agencias via convite. Voce pode visualizar e usar, sem editar o conteudo.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
            <p className="text-sm text-on-surface opacity-65 mt-3">Carregando suas viagens...</p>
          </div>
        ) : trips.length > 0 ? (
          <div className="scroll-reveal scroll-reveal-delay-100 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {trips.map((trip) => (
              <Link
                key={trip.id}
                href={`/app/trips/${trip.id}`}
                className="group bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm hover:border-primary hover:-translate-y-0.5 hover:shadow-md transition-all"
              >
                <div className="relative h-44 bg-surface-container-low">
                  {trip.coverImage ? (
                    <img src={trip.coverImage} alt={trip.name} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-primary bg-primary/5">
                      <span className="material-symbols-outlined text-4xl">travel_explore</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
                  <div className="absolute left-4 bottom-4 right-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-white/85">
                      {trip.agency?.name || 'Agencia'}
                    </p>
                    <h2 className="font-headline-sm text-lg font-black text-white mt-1 leading-tight">
                      {trip.name}
                    </h2>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-5">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-primary">Trilha liberada</p>
                      <p className="text-xs text-on-surface opacity-65 mt-1">Somente visualizacao</p>
                    </div>
                    <span className="material-symbols-outlined text-primary opacity-70 group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </div>

                  <div className="space-y-3 text-xs text-on-surface">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-primary">place</span>
                      <span className="font-semibold opacity-80">{trip.destinations?.join(', ') || 'Destino a confirmar'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-primary">calendar_today</span>
                      <span className="font-semibold opacity-80">{trip.startDate} a {trip.endDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-primary">route</span>
                      <span className="font-semibold opacity-80">{trip.itinerary?.length || 0} blocos na trilha</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-outline-variant rounded-xl bg-white p-10 text-center">
            <span className="material-symbols-outlined text-4xl text-primary opacity-70">travel_explore</span>
            <h2 className="font-headline-sm text-xl font-black text-on-surface mt-3">Nenhuma viagem importada</h2>
            <p className="text-sm text-on-surface opacity-70 mt-1 max-w-md mx-auto">
              Quando sua agencia enviar um convite, cole o link aqui para liberar a trilha no seu acesso.
            </p>
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="btn-interactive mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-on-primary hover:opacity-95"
            >
              <span className="material-symbols-outlined text-[16px]">add_link</span>
              Importar viagem via link
            </button>
          </div>
        )}
      </section>

      {importOpen && (
        <div className="fixed inset-0 z-[100] bg-on-background/45 backdrop-blur-sm flex items-center justify-center p-4">
          <section className="w-full max-w-lg bg-white border border-outline-variant rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-outline-variant flex items-start justify-between gap-4">
              <div>
                <h2 className="font-headline-md text-xl font-black text-on-surface">Importar viagem</h2>
                <p className="text-xs text-on-surface opacity-70 mt-1">
                  Cole o link de convite enviado pela agencia ou informe o codigo do convite.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="w-9 h-9 rounded-full hover:bg-surface-container-low flex items-center justify-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleImportTrip} className="p-6 space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface opacity-75">Link ou codigo do convite</label>
                <input
                  required
                  type="text"
                  value={linkOrToken}
                  onChange={(event) => setLinkOrToken(event.target.value)}
                  placeholder="https://.../mobile/invite/abc123"
                  className="input-interactive border border-outline-variant rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
              {error && <p className="text-xs font-semibold text-error bg-error/10 rounded-lg p-3">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setImportOpen(false)}
                  className="btn-interactive px-4 py-2.5 border border-outline rounded-lg text-xs font-semibold hover:bg-surface-container"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="btn-interactive px-5 py-2.5 bg-primary text-on-primary font-bold rounded-lg text-xs hover:opacity-90 disabled:opacity-60"
                >
                  {importing ? 'Importando...' : 'Importar'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default function TravelerTripsPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-surface" />}>
      <TravelerTripsContent />
    </Suspense>
  );
}
