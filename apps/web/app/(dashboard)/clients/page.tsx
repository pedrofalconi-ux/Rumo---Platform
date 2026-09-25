'use client';

import { useEffect, useMemo, useState } from 'react';

interface ClientRecord {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  cpf?: string;
  passport?: string;
  preferences?: {
    dietary?: string;
    mobility?: string;
    flightClass?: string;
    seat?: string;
  };
  documents?: Array<{ name: string; url?: string }>;
  appAccessStatus?: 'pending' | 'invited' | 'active';
}

interface TripRecord { id: string; name: string; clientId?: string; clientName?: string; startDate: string; endDate: string; status: string; }

const emptyClient = { fullName: '', email: '', phone: '', cpf: '', passport: '' };

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyClient);
  const [inviteLoadingTripId, setInviteLoadingTripId] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{ tripId: string; url: string } | null>(null);
  const [inviteError, setInviteError] = useState('');

  const load = async () => {
    const [clientsResponse, tripsResponse] = await Promise.all([fetch('/api/clients'), fetch('/api/trips')]);
    if (clientsResponse.ok) setClients(await clientsResponse.json());
    if (tripsResponse.ok) setTrips(await tripsResponse.json());
    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const filtered = useMemo(() => clients.filter((client) => `${client.fullName} ${client.email || ''}`.toLowerCase().includes(search.toLowerCase())), [clients, search]);
  const selected = clients.find((client) => client.id === selectedId) || null;
  const clientTrips = selected ? trips.filter((trip) => trip.clientId === selected.id || trip.clientName?.toLowerCase() === selected.fullName.toLowerCase()) : [];

  const createTravelerInvite = async (trip: TripRecord) => {
    if (!selected) return;
    setInviteLoadingTripId(trip.id);
    setInviteError('');
    setInviteResult(null);
    try {
      const response = await fetch(`/api/trips/${trip.id}/traveler-invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selected.id, channel: selected.phone ? 'whatsapp' : 'email' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível gerar o convite.');
      setInviteResult({ tripId: trip.id, url: data.url });
      setClients((current) => current.map((client) => client.id === selected.id ? { ...client, appAccessStatus: 'invited' } : client));
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Não foi possível gerar o convite.');
    } finally {
      setInviteLoadingTripId(null);
    }
  };

  const createClient = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, preferences: {}, documents: [] }) });
    if (response.ok) { const client = await response.json(); setClients((current) => [...current, client]); setSelectedId(client.id); setShowCreate(false); setForm(emptyClient); }
  };

  const updatePreferences = async (preferences: NonNullable<ClientRecord['preferences']>) => {
    if (!selected) return;
    const response = await fetch('/api/clients', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selected.id, preferences }) });
    if (response.ok) { const updated = await response.json(); setClients((current) => current.map((client) => client.id === updated.id ? updated : client)); }
  };

  return (
    <div className="mx-auto max-w-[1480px] space-y-6 animate-page-enter">
      <div className="page-heading flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-3xl font-black tracking-[-.035em] text-primary">Clientes</h1><p className="mt-1 text-sm text-on-surface/60">Relacionamento, preferências e histórico de viagens em um só lugar.</p></div>
        <button onClick={() => setShowCreate(true)} className="rounded-xl bg-coral px-5 py-3 text-xs font-bold text-white shadow-sm"><span className="material-symbols-outlined mr-2 text-[16px]">person_add</span>Novo cliente</button>
      </div>

      <div className="motion-stagger grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        <section className="motion-card overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm">
          <div className="border-b border-outline-variant p-4"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou e-mail..." className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-3 text-xs" /></div>
          <div className="max-h-[680px] divide-y divide-outline-variant overflow-y-auto">
            {loading ? <p className="p-8 text-center text-xs text-on-surface/50">Carregando clientes...</p> : filtered.map((client) => (
              <button key={client.id} onClick={() => setSelectedId(client.id)} className={`flex w-full items-center gap-3 p-4 text-left transition duration-200 hover:translate-x-1 ${selectedId === client.id ? 'bg-primary/7' : 'hover:bg-surface-container-low'}`}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-black text-primary">{client.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
                <span className="min-w-0"><span className="block truncate text-sm font-bold">{client.fullName}</span><span className="block truncate text-[10px] text-on-surface/50">{client.email || 'Sem e-mail cadastrado'}</span></span>
              </button>
            ))}
          </div>
        </section>

        <section key={selectedId || 'empty'} className="motion-panel-in rounded-2xl border border-primary/10 bg-white p-5 shadow-sm sm:p-7">
          {!selected ? <div className="flex min-h-[420px] flex-col items-center justify-center text-center"><span className="material-symbols-outlined text-5xl text-primary/20">contact_page</span><p className="mt-3 text-sm font-bold">Selecione um cliente</p><p className="mt-1 text-xs text-on-surface/50">O perfil completo aparecerá aqui.</p></div> : (
            <div className="motion-stagger space-y-7">
              <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-wider text-coral">Perfil do viajante</p><h2 className="mt-1 text-2xl font-black text-primary">{selected.fullName}</h2><p className="mt-1 text-xs text-on-surface/55">{selected.email} · {selected.phone || 'Sem telefone'}</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase ${selected.appAccessStatus === 'active' ? 'bg-emerald-50 text-emerald-700' : selected.appAccessStatus === 'invited' ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>{selected.appAccessStatus === 'active' ? 'App ativo' : selected.appAccessStatus === 'invited' ? 'Convite enviado' : 'Sem acesso ao app'}</span><div className="rounded-xl bg-ice-blue px-4 py-3 text-xs"><b>{clientTrips.length}</b> viagens</div></div></div>
              <div className="overflow-hidden rounded-2xl border border-primary/10 bg-[linear-gradient(135deg,#F3F7FF,#FFF8F5)]">
                <div className="flex items-start gap-3 border-b border-primary/10 p-5"><span className="material-symbols-outlined rounded-xl bg-primary p-2.5 text-white">phone_iphone</span><div><h3 className="text-sm font-black text-primary">Liberar viagem no aplicativo</h3><p className="mt-1 text-[11px] leading-relaxed text-on-surface/55">O cliente usa uma conta pessoal e importa cada viagem separadamente. Se também viajar com outra agência, os dados permanecem isolados e cada roteiro exibe a marca de quem o criou.</p></div></div>
                <div className="space-y-2 p-4">
                  {clientTrips.length ? clientTrips.map((trip) => <div key={trip.id} className="rounded-xl border border-white bg-white/80 p-3 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold">{trip.name}</p><p className="mt-0.5 text-[9px] text-on-surface/45">{trip.startDate} — {trip.endDate}</p></div><button onClick={() => void createTravelerInvite(trip)} disabled={inviteLoadingTripId === trip.id} className="inline-flex items-center gap-1.5 rounded-lg bg-coral px-3 py-2 text-[10px] font-black text-white disabled:opacity-50"><span className="material-symbols-outlined text-[15px]">send</span>{inviteLoadingTripId === trip.id ? 'Gerando...' : 'Gerar convite'}</button></div>{inviteResult?.tripId === trip.id ? <div className="mt-3 rounded-lg bg-ice-blue p-3"><p className="break-all text-[10px] text-primary">{inviteResult.url}</p><div className="mt-2 flex gap-3"><button onClick={() => void navigator.clipboard.writeText(inviteResult.url)} className="text-[10px] font-black text-primary">Copiar link</button><a href={`https://wa.me/?text=${encodeURIComponent(`Sua viagem está pronta no app: ${inviteResult.url}`)}`} target="_blank" rel="noreferrer" className="text-[10px] font-black text-emerald-700">Enviar por WhatsApp</a></div></div> : null}</div>) : <p className="rounded-xl border border-dashed border-outline-variant p-4 text-center text-[10px] text-on-surface/50">Vincule uma viagem a este cliente antes de gerar o acesso.</p>}
                  {inviteError ? <p className="rounded-lg bg-error/10 p-3 text-[10px] font-bold text-error">{inviteError}</p> : null}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2"><Info label="CPF" value={selected.cpf} /><Info label="Passaporte" value={selected.passport} /></div>
              <div><h3 className="mb-3 text-xs font-black uppercase tracking-wider text-primary">Preferências</h3><div className="grid gap-3 sm:grid-cols-2">{[['dietary','Restrições alimentares'],['mobility','Mobilidade e acessibilidade'],['flightClass','Classe de voo favorita'],['seat','Preferência de assento']].map(([key,label]) => <label key={key} className="space-y-1"><span className="text-[10px] font-bold text-on-surface/60">{label}</span><input defaultValue={selected.preferences?.[key as keyof NonNullable<ClientRecord['preferences']>] || ''} onBlur={(event) => void updatePreferences({ ...(selected.preferences || {}), [key]: event.target.value })} className="w-full rounded-xl border border-outline-variant p-3 text-xs" /></label>)}</div></div>
              <div><h3 className="mb-3 text-xs font-black uppercase tracking-wider text-primary">Histórico de viagens</h3>{clientTrips.length ? <div className="space-y-2">{clientTrips.map((trip) => <div key={trip.id} className="flex items-center justify-between rounded-xl border border-outline-variant p-3"><div><p className="text-xs font-bold">{trip.name}</p><p className="text-[10px] text-on-surface/50">{trip.startDate} — {trip.endDate}</p></div><span className="rounded-full bg-primary/8 px-2.5 py-1 text-[9px] font-bold text-primary">{trip.status}</span></div>)}</div> : <p className="rounded-xl border border-dashed border-outline-variant p-5 text-center text-xs text-on-surface/50">Nenhuma viagem vinculada pelo nome do cliente.</p>}</div>
              <div><h3 className="mb-3 text-xs font-black uppercase tracking-wider text-primary">Documentos frequentes</h3><div className="rounded-xl border border-dashed border-outline-variant p-5 text-center text-xs text-on-surface/50">Passaportes e vistos poderão ser anexados aqui com segurança.</div></div>
            </div>
          )}
        </section>
      </div>

      {showCreate && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"><form onSubmit={createClient} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-xl font-black text-primary">Novo cliente</h2><button type="button" onClick={() => setShowCreate(false)}><span className="material-symbols-outlined">close</span></button></div>{Object.entries({ fullName:'Nome completo', email:'E-mail', phone:'Telefone', cpf:'CPF', passport:'Passaporte' }).map(([key,label]) => <label key={key} className="block space-y-1"><span className="text-xs font-bold">{label}</span><input required={key === 'fullName'} value={form[key as keyof typeof form]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="w-full rounded-xl border border-outline-variant p-3 text-sm" /></label>)}<button className="w-full rounded-xl bg-primary py-3 text-xs font-bold text-white">Salvar cliente</button></form></div>}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) { return <div className="rounded-xl bg-surface-container-low p-4"><p className="text-[9px] font-black uppercase tracking-wider text-on-surface/45">{label}</p><p className="mt-1 text-sm font-bold">{value || 'Não informado'}</p></div>; }
