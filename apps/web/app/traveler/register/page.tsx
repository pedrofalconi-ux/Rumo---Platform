'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useState } from 'react';

function TravelerRegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite') || '';
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    emailConfirm: '',
    phone: '',
    password: '',
    inviteToken,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    if (formData.email !== formData.emailConfirm) {
      setError('Os e-mails informados nao conferem.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/traveler/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Nao foi possivel criar sua conta.');
        return;
      }

      router.push('/app/trips');
      router.refresh();
    } catch {
      setError('Erro de conexao ao criar sua conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-white border border-outline-variant rounded-xl shadow-sm p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <img src="/rumo-mark.svg" alt="Rumo" className="h-12 w-12 rounded-full shadow-sm" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Rumo</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-on-surface opacity-55">Area do viajante</p>
            </div>
          </div>
          <h1 className="font-headline-lg text-2xl font-bold text-on-surface mt-2">Criar conta de viajante</h1>
          <p className="text-sm text-on-surface opacity-70 mt-1">
            Use sua conta para importar roteiros enviados pela sua agencia.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface">Nome completo</label>
            <input
              required
              type="text"
              value={formData.fullName}
              onChange={(event) => setFormData((prev) => ({ ...prev, fullName: event.target.value }))}
              className="border border-outline-variant rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface">E-mail</label>
            <input
              required
              type="email"
              value={formData.email}
              onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
              className="border border-outline-variant rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface">Confirmar e-mail</label>
            <input
              required
              type="email"
              value={formData.emailConfirm}
              onChange={(event) => setFormData((prev) => ({ ...prev, emailConfirm: event.target.value }))}
              className="border border-outline-variant rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface">Telefone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
              className="border border-outline-variant rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface">Link ou codigo do convite da agencia</label>
            <input
              required
              type="text"
              value={formData.inviteToken}
              onChange={(event) => setFormData((prev) => ({ ...prev, inviteToken: event.target.value }))}
              placeholder="Cole o link enviado pela agencia"
              className="border border-outline-variant rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface">Senha</label>
            <div className="relative">
              <input
                required
                minLength={6}
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
                className="w-full border border-outline-variant rounded-lg p-3 pr-11 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center text-on-surface opacity-70"
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {error && <p className="text-xs font-semibold text-error bg-error/10 rounded-lg p-3">{error}</p>}

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-primary text-on-primary rounded-lg py-3 text-xs font-bold hover:opacity-95 disabled:opacity-60 transition-all"
          >
            {loading ? 'CRIANDO...' : 'CRIAR CONTA DE VIAJANTE'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between gap-3 text-xs text-on-surface opacity-75">
          <Link href="/login" className="font-bold text-primary hover:underline">
            Ja tenho conta
          </Link>
          <Link href="/register" className="font-bold text-primary hover:underline">
            Sou agencia
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function TravelerRegisterPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-surface" />}>
      <TravelerRegisterContent />
    </Suspense>
  );
}
