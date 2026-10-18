'use client';

import React, { useEffect, useState } from 'react';

interface SettingsForm {
  agencyName: string;
  logoUrl: string;
  defaultCurrency: string;
  notificationEmail: string;
  appThemeId: string;
}

const emptySettings: SettingsForm = {
  agencyName: '',
  logoUrl: '',
  defaultCurrency: 'BRL',
  notificationEmail: '',
  appThemeId: 'rumo',
};

const APP_THEMES = [
  {
    id: 'rumo',
    name: 'Identidade Rumo',
    description: 'Azul luminoso, ciano e tipografia limpa. É a experiência padrão do painel e do aplicativo.',
    swatch: ['#2E8BFF', '#00B8D9', '#0B1E3A'],
  },
  {
    id: 'quiet-luxury',
    name: 'Editorial',
    description: 'Tons terrosos e tipografia clássica para uma experiência discreta e sofisticada.',
    swatch: ['#93542F', '#F6F1E6', '#262218'],
  },
  {
    id: 'fall-guys',
    name: 'Vibrante',
    description: 'Cores vivas e formas suaves para viagens em grupo, intercâmbio e públicos mais jovens.',
    swatch: ['#FF3E7F', '#FFD23F', '#3A1F5D'],
  },
] as const;

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [formData, setFormData] = useState<SettingsForm>(emptySettings);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'branding'>('general');

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
        alert('Preferências salvas com sucesso.');
      } else {
        alert('Não foi possível salvar as preferências.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <div className="page-heading scroll-reveal">
        <h2 className="font-headline-lg text-3xl font-bold tracking-[-.035em] text-on-surface">Configurações</h2>
        <p className="mt-1 text-sm text-on-surface/60">
          Ajuste os dados da agência e a experiência que seus viajantes recebem.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-outline-variant bg-white p-1.5">
        {[
          ['general', 'tune', 'Geral'],
          ['branding', 'palette', 'Marca no aplicativo'],
        ].map(([id, icon, label]) => (
          <button key={id} type="button" onClick={() => setActiveTab(id as typeof activeTab)} className={`flex min-w-fit flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${activeTab === id ? 'bg-primary text-white shadow-sm' : 'text-on-surface/55 hover:bg-surface-container-low'}`}>
            <span className="material-symbols-outlined text-[17px]">{icon}</span>{label}
          </button>
        ))}
      </div>

      <div key={activeTab} className="motion-panel-in rounded-2xl border border-outline-variant bg-white p-6 sm:p-8">
        {loadingSettings ? (
          <div className="py-12 flex items-center justify-center gap-2 text-sm font-semibold">
            <span className="material-symbols-outlined animate-spin text-primary">sync</span>
            Carregando configuracoes...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {activeTab === 'general' && <div className="space-y-4">
              <div className="border-b border-outline-variant pb-3"><h3 className="text-sm font-semibold text-on-surface">Dados da agência</h3><p className="mt-1 text-xs text-on-surface/50">Estas informações identificam sua operação dentro da Rumo.</p></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">Nome da agência</label>
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
                  <label className="text-xs font-semibold">E-mail para notificações</label>
                  <input
                    type="email"
                    name="notificationEmail"
                    value={formData.notificationEmail}
                    onChange={handleChange}
                    className="input-interactive border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">Moeda principal</label>
                  <select
                    name="defaultCurrency"
                    value={formData.defaultCurrency}
                    onChange={handleChange}
                    className="input-interactive border border-outline-variant rounded-lg p-2.5 text-xs bg-white focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="BRL">Real brasileiro (BRL)</option>
                    <option value="USD">Dólar americano (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                </div>
              </div>
            </div>}

            {activeTab === 'branding' && <div className="space-y-5">
              <div><h3 className="text-sm font-semibold text-on-surface">Sua marca no aplicativo</h3><p className="mt-1 text-xs text-on-surface/55">Escolha como sua agência aparece para cada viajante.</p></div>
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
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-error text-white shadow-md transition-all duration-150 hover:scale-110 hover:bg-red-700 active:scale-95"
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
              <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-5">
                <label className="text-xs font-semibold">Identidade visual do app</label>
                <p className="mt-1 text-[11px] text-on-surface/55">
                  Por padrão, o app do viajante usa a mesma identidade do seu painel. Troque se quiser diferenciar a experiência dos seus viajantes.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {APP_THEMES.map((theme) => {
                    const selected = formData.appThemeId === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, appThemeId: theme.id }))}
                        className={`flex flex-col gap-2 rounded-xl border p-3 text-left transition ${selected ? 'border-primary ring-1 ring-primary bg-white' : 'border-outline-variant bg-white hover:border-primary/40'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1">
                            {theme.swatch.map((hex) => (
                              <span key={hex} className="h-5 w-5 rounded-full border border-black/5" style={{ backgroundColor: hex }} />
                            ))}
                          </div>
                          {selected && <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>}
                        </div>
                        <span className="text-xs font-bold">{theme.name}</span>
                        <span className="text-[10px] leading-snug text-on-surface/55">{theme.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>}

            <div className="ui-action-bar justify-end border-t border-outline-variant pt-4">
              <button
                disabled={loading}
                type="submit"
                className="ui-btn ui-btn-primary"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                {loading ? 'Salvando...' : 'Salvar preferências'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
