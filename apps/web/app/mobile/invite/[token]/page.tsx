import { notFound } from 'next/navigation';
import { db } from '@rumo/db';
import Link from 'next/link';

export default async function MobileInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = db.travelerInvites.findByToken(token);
  if (!invite || invite.status !== 'active' || new Date(invite.expiresAt) < new Date()) {
    notFound();
  }

  const trip = db.trips.findOne(invite.tripId);
  if (!trip || trip.agencyId !== invite.agencyId) {
    notFound();
  }

  const agency = db.agencies.findOne(trip.agencyId);
  if (!agency) {
    notFound();
  }

  const data = {
    invite,
    agency,
    trip: {
      title: trip.name,
      destination: trip.destinations?.join(', ') || '',
      startDate: trip.startDate,
      endDate: trip.endDate,
    },
  };

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-white border border-outline-variant rounded-xl shadow-sm p-8 text-center">
        {data.agency.logoUrl ? (
          <img src={data.agency.logoUrl} alt={data.agency.name} className="w-16 h-16 object-cover rounded-xl mx-auto mb-4" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-primary text-on-primary flex items-center justify-center mx-auto mb-4 text-xl font-bold">
            {data.agency.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{data.agency.name}</p>
        <h1 className="font-headline-lg text-2xl font-bold text-on-surface mt-2">{data.trip.title}</h1>
        <p className="text-sm text-on-surface opacity-70 mt-2">
          Convite liberado para {data.invite.travelerName}. Crie sua conta de viajante ou entre na area web para importar esta viagem.
        </p>
        <div className="mt-6 rounded-lg bg-surface-container-low p-4 text-left">
          <p className="text-xs font-bold text-on-surface">Destino</p>
          <p className="text-sm text-primary font-bold">{data.trip.destination}</p>
          <p className="text-xs text-on-surface opacity-70 mt-2">
            {data.trip.startDate} a {data.trip.endDate}
          </p>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-2">
          <Link href={`/traveler/register?invite=${encodeURIComponent(token)}`} className="rounded-lg bg-primary text-on-primary px-4 py-3 text-xs font-bold hover:opacity-95">
            Criar conta de viajante
          </Link>
          <Link href={`/app/trips?invite=${encodeURIComponent(token)}`} className="rounded-lg border border-outline-variant px-4 py-3 text-xs font-bold text-primary hover:bg-surface-container-low">
            Ja tenho conta, importar no portal
          </Link>
        </div>
        <p className="mt-4 text-[10px] text-on-surface opacity-55 break-all">
          Codigo do convite: {token}
        </p>
      </section>
    </main>
  );
}
