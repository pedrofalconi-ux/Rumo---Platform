'use client';

import React, { useEffect, useState } from 'react';

interface SettingsForm {
  agencyName: string;
  logoUrl: string;
  defaultCurrency: string;
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
  const [uploading, setUploading] = useState(false);

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const uData = new FormData();
    uData.append('logo', file);

    try {
      const response = await fetch('/api/settings/upload', {
        method: 'POST',
        body: uData,
      });

      if (response.ok) {
        const result = await response.json();
        setFormData((prev) => ({
          ...prev,
          logoUrl: result.logoUrl,
        }));
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Erro ao enviar a imagem.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao enviar a imagem.');
    } finally {
      setUploading(false);
    }
  };

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
      <div className="scroll-reveal">
        <h2 className="font-headline-lg text-2xl font-bold text-primary tracking-tight">CONFIGURACOES</h2>
        <p className="text-on-surface opacity-75 text-sm mt-1">
          Gerencie preferencias da agencia e credenciais operacionais do seu tenant.
        </p>
      </div>

      <div className="scroll-reveal scroll-reveal-delay-100 bg-white rounded-xl border border-outline-variant p-8 shadow-sm">
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
                    className="input-interactive border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface opacity-85">Logo da Agência</label>
                  <div className="flex items-center gap-3 mt-0.5">
                    <div className="w-11 h-11 bg-white border border-outline-variant rounded-lg overflow-hidden flex items-center justify-center shadow-sm relative shrink-0">
                      {formData.logoUrl ? (
                        <img 
                          src={formData.logoUrl} 
                          alt="Logo" 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-xl text-outline">image</span>
                      )}
                    </div>
                    <div className="flex-1 flex gap-2">
                      <label 
                        htmlFor="logo-upload-input"
                        className="btn-interactive flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 border border-outline rounded-lg text-xs font-semibold hover:bg-surface-container transition-colors cursor-pointer select-none active:scale-[0.98] duration-150 text-center"
                      >
                        <span className="material-symbols-outlined text-base">cloud_upload</span>
                        <span>{uploading ? 'Enviando...' : formData.logoUrl ? 'Alterar' : 'Upload'}</span>
                      </label>
                      <input
                        id="logo-upload-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoFileChange}
                        disabled={uploading}
                      />
                      {formData.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, logoUrl: '' }))}
                          className="btn-interactive px-3 py-2.5 border border-red-200 text-red-500 hover:bg-red-50 font-bold rounded-lg text-xs active:scale-[0.98] transition-colors duration-150"
                          title="Remover logo"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
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
                    className="input-interactive border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">Moeda Principal</label>
                  <select
                    name="defaultCurrency"
                    value={formData.defaultCurrency}
                    onChange={handleChange}
                    className="input-interactive border border-outline-variant rounded-lg p-2.5 text-xs bg-white focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="BRL">Real Brasileiro (BRL)</option>
                    <option value="USD">Dolar Americano (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
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
                  className="input-interactive border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">TBO Holidays Token</label>
                <input
                  type="password"
                  name="tboKey"
                  value={formData.tboKey}
                  onChange={handleChange}
                  className="input-interactive border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">Anthropic Claude AI API Key</label>
                <input
                  type="password"
                  name="claudeKey"
                  value={formData.claudeKey}
                  onChange={handleChange}
                  className="input-interactive border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
              <button
                disabled={loading}
                type="submit"
                className="btn-interactive px-6 py-2.5 bg-primary text-on-primary font-semibold text-xs rounded-lg hover:opacity-95 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50"
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
