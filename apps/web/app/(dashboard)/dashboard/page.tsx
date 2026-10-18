import Link from 'next/link';
import { getDashboardPageData } from '../../../lib/server-dashboard-data';
import DashboardNews from './dashboard-news';

function formatTripDate(value: string) {
  if (!value) return 'Data a definir';
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
    .format(date)
    .replace('.', '');
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'confirmado' || normalized === 'confirmed') return 'bg-status-confirmed text-success';
  if (normalized === 'publicado' || normalized === 'active') return 'bg-ice-blue text-primary';
  if (normalized === 'cancelado' || normalized === 'cancelled') return 'bg-status-cancelled text-error';
  if (normalized === 'rascunho' || normalized === 'draft') return 'bg-surface-container text-on-surface/60';
  return 'bg-[#EDF8FF] text-[#24536B]';
}

export default async function DashboardPage() {
  const { user, summary } = await getDashboardPageData();
  const today = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    timeZone: 'America/Fortaleza',
  }).format(new Date());

  const firstName = user?.fullName?.split(' ')[0] || 'consultor';
  const stats = [
    { label: 'Viagens ativas', value: summary.counts.activeTrips, icon: 'flight_takeoff', tone: 'text-primary bg-ice-blue' },
    { label: 'Total de viagens', value: summary.counts.totalTrips, icon: 'route', tone: 'text-on-surface bg-surface-container' },
    { label: 'Clientes', value: summary.counts.totalClients, icon: 'group', tone: 'text-success bg-status-active' },
    { label: 'Equipe', value: summary.counts.totalUsers, icon: 'badge', tone: 'text-sky-700 bg-sky-50' },
  ];

  const quickActions = [
    { label: 'Criar viagem', detail: 'Inicie um roteiro', icon: 'add', href: '/trips/new' },
    { label: 'Ver clientes', detail: 'Acesse os perfis', icon: 'person_search', href: '/clients' },
    { label: 'Abrir biblioteca', detail: 'Fotos e modelos', icon: 'collections_bookmark', href: '/library' },
    { label: 'Gerenciar equipe', detail: 'Acessos e usuários', icon: 'group', href: '/users' },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-7">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium capitalize tracking-[.04em] text-on-surface/48">{today}</p>
          <h1 className="mt-2 text-[32px] font-bold leading-[1.08] tracking-[-.04em] text-on-surface sm:text-[38px]">
            Olá, {firstName}.
          </h1>
          <p className="mt-2 text-sm text-on-surface/52">Tudo que importa para sua operação, sem distrações.</p>
        </div>
        <Link
          href="/trips/new"
          prefetch={false}
          className="ui-btn ui-btn-primary"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Criar nova viagem
        </Link>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-outline-variant bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-primary/15 bg-ice-blue text-primary">
            <span className="material-symbols-outlined text-[21px]">travel_explore</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-on-surface">Sua operação está pronta para seguir</p>
            <p className="mt-1 text-xs leading-relaxed text-on-surface/50">
              {summary.counts.activeTrips} {summary.counts.activeTrips === 1 ? 'viagem ativa' : 'viagens ativas'} e{' '}
              {summary.counts.totalClients} clientes na base.
            </p>
          </div>
        </div>
        <Link
          href="/trips"
          prefetch={false}
          className="ui-btn ui-btn-secondary shrink-0"
        >
          Ver viagens
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </section>

      <section className="overflow-hidden rounded-2xl border border-outline-variant bg-white">
        <div className="grid grid-cols-2 divide-x divide-y divide-outline-variant md:grid-cols-4 md:divide-y-0">
          {stats.map((stat) => (
            <div key={stat.label} className="flex min-h-[104px] items-center gap-3 p-4 sm:p-5">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${stat.tone}`}>
                <span className="material-symbols-outlined text-[19px]">{stat.icon}</span>
              </span>
              <span>
                <strong className="block text-2xl font-bold leading-none tracking-[-.03em]">{stat.value}</strong>
                <span className="mt-1.5 block text-[11px] font-medium text-on-surface/46">{stat.label}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.75fr)]">
        <section className="overflow-hidden rounded-2xl border border-outline-variant bg-white">
          <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Viagens em destaque</h2>
              <p className="mt-1 text-[11px] text-on-surface/43">Acesse rapidamente o que está em andamento.</p>
            </div>
            <Link href="/trips" prefetch={false} className="text-[11px] font-semibold text-primary hover:underline">
              Ver todas
            </Link>
          </div>

          <div className="divide-y divide-outline-variant">
            {summary.recentTrips.length ? (
              summary.recentTrips.map((trip) => (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.id}/edit`}
                  prefetch={false}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-container-low"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-outline-variant bg-white text-primary">
                    <span className="material-symbols-outlined text-[18px]">flight</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <strong className="truncate text-xs font-semibold text-on-surface">{trip.name}</strong>
                      <span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${statusClass(trip.status)}`}>
                        {trip.status}
                      </span>
                    </span>
                    <span className="mt-1.5 block truncate text-[11px] text-on-surface/46">
                      {trip.destination} · {trip.clientName}
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-right sm:block">
                    <span className="block text-[10px] font-medium text-on-surface/55">
                      {formatTripDate(trip.startDate)} — {formatTripDate(trip.endDate)}
                    </span>
                    <span className="mt-1 block text-[9px] text-on-surface/35">{trip.id}</span>
                  </span>
                  <span className="material-symbols-outlined text-[17px] text-on-surface/25 transition-transform group-hover:translate-x-0.5 group-hover:text-primary">
                    arrow_forward
                  </span>
                </Link>
              ))
            ) : (
              <div className="px-5 py-12 text-center">
                <span className="material-symbols-outlined text-[30px] text-on-surface/20">luggage</span>
                <p className="mt-2 text-xs font-semibold">Nenhuma viagem por aqui ainda</p>
                <Link href="/trips/new" className="mt-2 inline-block text-[11px] font-semibold text-primary hover:underline">
                  Criar a primeira viagem
                </Link>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-outline-variant bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Ações rápidas</h2>
              <span className="text-[9px] font-semibold uppercase tracking-[.14em] text-on-surface/30">Atalhos</span>
            </div>
            <div className="mt-4 divide-y divide-outline-variant">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  prefetch={false}
                  className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-container-low text-on-surface/58 group-hover:bg-ice-blue group-hover:text-primary">
                    <span className="material-symbols-outlined text-[17px]">{action.icon}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold">{action.label}</span>
                    <span className="mt-0.5 block text-[10px] text-on-surface/42">{action.detail}</span>
                  </span>
                  <span className="material-symbols-outlined text-[15px] text-on-surface/23 group-hover:text-primary">arrow_forward</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-primary/15 bg-ice-blue/55 p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-primary">
                <span className="material-symbols-outlined text-[19px]">auto_awesome</span>
              </span>
              <div>
                <p className="text-xs font-semibold">Copiloto Rumo</p>
                <p className="mt-1 text-[11px] leading-relaxed text-on-surface/50">
                  Transforme as preferências do cliente em um roteiro pronto para revisar.
                </p>
              </div>
            </div>
            <Link
              href="/trips/new"
              prefetch={false}
              className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              Criar com IA <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </Link>
          </section>
        </aside>
      </div>

      <DashboardNews />
    </div>
  );
}
