'use client';

import React, { useEffect, useState } from 'react';

interface AgencyTenant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  plan: string;
  subscriptionStatus: string;
  accessExpiresAt: string;
  createdAt: string;
  usersCount: number;
  users?: Array<{
    id: string;
    fullName: string;
    email: string;
    role: string;
    accessStatus?: string;
  }>;
  tripsCount: number;
}

export default function AdminAgenciesPage() {
  const [agencies, setAgencies] = useState<AgencyTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchAgencies = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/agencies');
      if (response.ok) {
        setAgencies(await response.json());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgencies();
  }, []);

  const updateLocalAgency = (id: string, patch: Partial<AgencyTenant>) => {
    setAgencies((prev) => prev.map((agency) => (agency.id === id ? { ...agency, ...patch } : agency)));
  };

  const saveAgency = async (agency: AgencyTenant) => {
    setSavingId(agency.id);
    try {
      const response = await fetch('/api/admin/agencies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agency),
      });

      if (!response.ok) {
        alert('Nao foi possivel atualizar a agencia.');
        return;
      }

      await fetchAgencies();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Admin SaaS</p>
          <h2 className="font-headline-lg text-2xl font-bold text-on-surface tracking-tight mt-1">
            Agencias e acesso da plataforma
          </h2>
          <p className="text-on-surface opacity-75 text-sm mt-1">
            Controle tenants, planos, status de assinatura e validade de acesso das agencias.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-sm font-semibold">
            <span className="material-symbols-outlined animate-spin text-primary">sync</span>
            Carregando agencias...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr className="text-[10px] uppercase tracking-wider text-on-surface opacity-65">
                  <th className="px-4 py-3 font-black">Agencia</th>
                  <th className="px-4 py-3 font-black">Plano</th>
                  <th className="px-4 py-3 font-black">Status</th>
                  <th className="px-4 py-3 font-black">Acesso ate</th>
                  <th className="px-4 py-3 font-black">Usuarios</th>
                  <th className="px-4 py-3 font-black text-center">Viagens</th>
                  <th className="px-4 py-3 font-black text-right">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {agencies.map((agency) => (
                  <tr key={agency.id} className="align-middle">
                    <td className="px-4 py-4 min-w-[240px]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black">
                          {agency.logoUrl ? (
                            <img src={agency.logoUrl} alt={agency.name} className="w-full h-full object-contain rounded-lg" />
                          ) : (
                            agency.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <input
                            value={agency.name}
                            onChange={(event) => updateLocalAgency(agency.id, { name: event.target.value })}
                            className="w-full font-black text-on-surface bg-transparent border border-transparent hover:border-outline-variant focus:border-primary rounded px-2 py-1 outline-none"
                          />
                          <p className="text-[10px] text-on-surface opacity-50 px-2">{agency.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 min-w-[130px]">
                      <select
                        value={agency.plan}
                        onChange={(event) => updateLocalAgency(agency.id, { plan: event.target.value })}
                        className="w-full border border-outline-variant rounded-lg p-2 bg-white font-semibold outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="starter">Starter</option>
                        <option value="business">Business</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </td>
                    <td className="px-4 py-4 min-w-[150px]">
                      <select
                        value={agency.subscriptionStatus}
                        onChange={(event) => updateLocalAgency(agency.id, { subscriptionStatus: event.target.value })}
                        className="w-full border border-outline-variant rounded-lg p-2 bg-white font-semibold outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="active">Ativa</option>
                        <option value="past_due">Pagamento pendente</option>
                        <option value="paused">Pausada</option>
                        <option value="cancelled">Cancelada</option>
                      </select>
                    </td>
                    <td className="px-4 py-4 min-w-[150px]">
                      <input
                        type="date"
                        value={agency.accessExpiresAt ? agency.accessExpiresAt.slice(0, 10) : ''}
                        onChange={(event) =>
                          updateLocalAgency(agency.id, {
                            accessExpiresAt: event.target.value ? new Date(`${event.target.value}T23:59:59`).toISOString() : '',
                          })
                        }
                        className="w-full border border-outline-variant rounded-lg p-2 bg-white font-semibold outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                    <td className="px-4 py-4 min-w-[220px]">
                      <p className="font-black text-on-surface">{agency.usersCount} usuario(s)</p>
                      <div className="mt-2 space-y-1">
                        {(agency.users || []).slice(0, 3).map((agencyUser) => (
                          <div key={agencyUser.id} className="text-[10px] text-on-surface opacity-70">
                            <span className="font-bold">{agencyUser.fullName}</span>
                            <span> · {agencyUser.role}</span>
                          </div>
                        ))}
                        {(agency.users || []).length > 3 && (
                          <p className="text-[10px] text-primary font-bold">+{(agency.users || []).length - 3} outros</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center font-black">{agency.tripsCount}</td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => saveAgency(agency)}
                        disabled={savingId === agency.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[11px] font-black text-on-primary hover:opacity-95 disabled:opacity-55"
                      >
                        <span className="material-symbols-outlined text-[14px]">save</span>
                        {savingId === agency.id ? 'Salvando...' : 'Salvar'}
                      </button>
                    </td>
                  </tr>
                ))}
                {agencies.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-on-surface opacity-60">
                      Nenhuma agencia cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
