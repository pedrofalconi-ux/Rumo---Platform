'use client';

import React, { useEffect, useState } from 'react';

interface SettingsForm {
  agencyName: string;
  logoUrl: string;
  defaultCurrency: string;
  plan: string;
  subscriptionStatus: string;
  accessExpiresAt: string;
  amadeusKey: string;
  tboKey: string;
  claudeKey: string;
  pixabayKey: string;
  notificationEmail: string;
}

const emptySettings: SettingsForm = {
  agencyName: '',
  logoUrl: '',
  defaultCurrency: 'BRL',
  plan: '',
  subscriptionStatus: 'active',
  accessExpiresAt: '',
  amadeusKey: '',
  tboKey: '',
  claudeKey: '',
  pixabayKey: '',
  notificationEmail: '',
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [formData, setFormData] = useState<SettingsForm>(emptySettings);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          setFormData(await response.json());
        }
      } finally {
        setLoadingSettings(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormData(await response.json());
        alert('Configuracoes salvas no banco com sucesso!');
      } else {
        alert('Nao foi possivel salvar as configuracoes.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <div>
        <h2 className="font-headline-lg text-2xl font-bold text-primary tracking-tight">CONFIGURACOES</h2>
        <p className="text-on-surface opacity-75 text-sm mt-1">
          Gerencie as preferencias da agencia e configure credenciais operacionais.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-outline-variant p-8 shadow-sm">
        {loadingSettings ? (
          <div className="py-12 flex items-center justify-center gap-2 text-sm font-semibold">
            <span className="material-symbols-outlined animate-spin text-primary">sync</span>
            Carregando configuracoes...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider border-b pb-2">Perfil da Agencia</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">Nome da Agencia</label>
                  <input
                    required
                    type="text"
                    name="agencyName"
                    value={formData.agencyName}
                    onChange={handleChange}
                    className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">Logo URL</label>
                  <input
                    type="text"
                    name="logoUrl"
                    placeholder="https://..."
                    value={formData.logoUrl}
                    onChange={handleChange}
                    className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">E-mail de Notificacao</label>
                  <input
                    type="email"
                    name="notificationEmail"
                    value={formData.notificationEmail}
                    onChange={handleChange}
                    className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">Moeda Principal</label>
                  <select
                    name="defaultCurrency"
                    value={formData.defaultCurrency}
                    onChange={handleChange}
                    className="border border-outline-variant rounded-lg p-2.5 text-xs bg-white focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="BRL">Real Brasileiro (BRL)</option>
                    <option value="USD">Dolar Americano (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">Status da assinatura</label>
                  <select
                    name="subscriptionStatus"
                    value={formData.subscriptionStatus}
                    onChange={handleChange}
                    className="border border-outline-variant rounded-lg p-2.5 text-xs bg-white focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="active">Ativa</option>
                    <option value="past_due">Pagamento pendente</option>
                    <option value="paused">Pausada</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">Acesso da agencia ate</label>
                  <input
                    type="date"
                    name="accessExpiresAt"
                    value={formData.accessExpiresAt ? formData.accessExpiresAt.slice(0, 10) : ''}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        accessExpiresAt: event.target.value ? new Date(`${event.target.value}T23:59:59`).toISOString() : '',
                      }))
                    }
                    className="border border-outline-variant rounded-lg p-2.5 text-xs bg-white focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider border-b pb-2">Credenciais e Integracoes</h3>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">Amadeus API Credentials</label>
                <input
                  type="password"
                  name="amadeusKey"
                  value={formData.amadeusKey}
                  onChange={handleChange}
                  className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">TBO Holidays Token</label>
                <input
                  type="password"
                  name="tboKey"
                  value={formData.tboKey}
                  onChange={handleChange}
                  className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">Anthropic Claude AI API Key</label>
                <input
                  type="password"
                  name="claudeKey"
                  value={formData.claudeKey}
                  onChange={handleChange}
                  className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
              <button
                disabled={loading}
                type="submit"
                className="px-6 py-2.5 bg-primary text-on-primary font-semibold text-xs rounded-lg hover:opacity-95 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? 'SALVANDO...' : 'SALVAR PREFERENCIAS'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
