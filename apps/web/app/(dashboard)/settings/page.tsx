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
  unsplashKey: string;
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
  unsplashKey: '',
  notificationEmail: '',
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [formData, setFormData] = useState<SettingsForm>(emptySettings);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'branding' | 'integrations'>('general');

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 2 MB.');
      e.target.value = '';
      return;
    }

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
        window.dispatchEvent(new CustomEvent('rumo:branding-updated', {
          detail: { logoUrl: result.logoUrl, agencyName: formData.agencyName },
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
      e.target.value = '';
    }
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logoUrl: '',
    }));
    window.dispatchEvent(
      new CustomEvent('rumo:branding-updated', {
        detail: { logoUrl: '', agencyName: formData.agencyName },
      })
    );
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
      <div className="page-heading scroll-reveal">
        <h2 className="font-headline-lg text-3xl font-black text-primary tracking-[-.035em]">Configurações</h2>
        <p className="text-on-surface opacity-75 text-sm mt-1">
          Gerencie preferencias da agencia e credenciais operacionais do seu tenant.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-primary/10 bg-white p-1.5 shadow-sm">
        {[
          ['general', 'tune', 'Geral'],
          ['branding', 'palette', 'Branding & White-label'],
          ['integrations', 'key', 'Integrações'],
        ].map(([id, icon, label]) => (
          <button key={id} type="button" onClick={() => setActiveTab(id as typeof activeTab)} className={`flex min-w-fit flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${activeTab === id ? 'bg-primary text-white shadow-sm' : 'text-on-surface/55 hover:bg-surface-container-low'}`}>
            <span className="material-symbols-outlined text-[17px]">{icon}</span>{label}
          </button>
        ))}
      </div>

      <div key={activeTab} className="motion-panel-in bg-white rounded-2xl border border-primary/10 p-6 sm:p-8 shadow-[0_10px_30px_rgba(16,28,58,.055)]">
        {loadingSettings ? (
          <div className="py-12 flex items-center justify-center gap-2 text-sm font-semibold">
            <span className="material-symbols-outlined animate-spin text-primary">sync</span>
            Carregando configuracoes...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {activeTab === 'general' && <div className="space-y-4">
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
                <div className="hidden flex-col gap-1">
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
                          onClick={handleRemoveLogo}
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
            </div>}

            {activeTab === 'branding' && <div className="space-y-5">
              <div><h3 className="text-xs font-bold text-primary uppercase tracking-wider">Branding & White-label</h3><p className="mt-1 text-xs text-on-surface/55">Personalize a experiência entregue ao viajante.</p></div>
              <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-5">
                <label className="text-xs font-semibold">Logo da agência</label>
                <div className="mt-3 flex items-center gap-4">
                  <div className="relative group h-16 w-16 shrink-0">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm transition duration-200">
                      {formData.logoUrl ? (
                        <img src={formData.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                      ) : (
                        <img src="/rumo-mark.svg" alt="Logo Default" className="h-full w-full object-contain p-2 opacity-40 group-hover:opacity-60 transition-opacity duration-200" />
                      )}
                    </div>
                    {formData.logoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-coral text-white shadow-md hover:bg-red-600 hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer"
                        title="Remover logo"
                      >
                        <span className="material-symbols-outlined text-[12px] font-black">close</span>
                      </button>
                    )}
                  </div>
                  <label htmlFor="branding-logo-upload" className="cursor-pointer rounded-xl border border-primary/20 bg-white px-4 py-2.5 text-xs font-bold text-primary hover:bg-surface-container transition-colors duration-150"><span className="material-symbols-outlined mr-2 text-[16px]">cloud_upload</span>{uploading ? 'Enviando...' : 'Escolher logo'}</label>
                  <input id="branding-logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoFileChange} disabled={uploading} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2"><label className="space-y-1"><span className="text-xs font-semibold">Cor principal do app</span><div className="flex items-center gap-3 rounded-xl border border-outline-variant p-3"><span className="h-8 w-8 rounded-lg bg-primary" /><span className="text-xs font-mono text-on-surface/55">Identidade Rumo</span></div></label><label className="space-y-1"><span className="text-xs font-semibold">Domínio personalizado</span><input disabled placeholder="app.suaagencia.com" className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-3 text-xs" /><span className="text-[9px] text-on-surface/45">Disponível em breve.</span></label></div>
            </div>}

            {activeTab === 'integrations' && <div className="space-y-4 pt-1">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider border-b pb-2">Credenciais e Integracoes</h3>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800"><b>Acesso técnico:</b> estas chaves controlam serviços externos da agência. Compartilhe somente com administradores autorizados.</div>

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

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">Pixabay API Key</label>
                <input
                  type="password"
                  name="pixabayKey"
                  value={formData.pixabayKey}
                  onChange={handleChange}
                  className="input-interactive border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">Unsplash Access Key</label>
                <input
                  type="password"
                  name="unsplashKey"
                  value={formData.unsplashKey}
                  onChange={handleChange}
                  className="input-interactive border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
                <p className="text-[11px] text-on-surface opacity-60">
                  Opcional. Quando preenchida, a busca de fotos prioriza o Unsplash antes do Pixabay.
                </p>
              </div>

            </div>}

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
