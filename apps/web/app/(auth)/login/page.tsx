'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Nao foi possivel entrar.');
        return;
      }

      router.push(data.user?.role === 'traveler' ? '/app/trips' : '/dashboard');
      router.refresh();
    } catch {
      setError('Erro de conexao ao tentar entrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center p-6">
      <section className="animate-page-enter w-full max-w-md bg-white border border-outline-variant rounded-xl shadow-sm p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <img src="/rumo-mark.svg" alt="Rumo" className="h-12 w-12 rounded-full shadow-sm" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Rumo</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-on-surface opacity-55">A sua bussola</p>
            </div>
          </div>
          <h1 className="font-headline-lg text-2xl font-bold text-on-surface mt-2">Entrar na plataforma</h1>
          <p className="text-sm text-on-surface opacity-70 mt-1">Acesse sua area operacional de viagens.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface">E-mail</label>
            <input
              required
              type="email"
              value={formData.email}
              onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
              className="input-interactive border border-outline-variant rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface">Senha</label>
            <div className="relative">
              <input
                required
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
                className="input-interactive w-full border border-outline-variant rounded-lg p-3 pr-11 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
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
            className="btn-interactive w-full bg-primary text-on-primary rounded-lg py-3 text-xs font-bold hover:opacity-95 disabled:opacity-60 transition-all"
          >
            {loading ? 'ENTRANDO...' : 'ENTRAR'}
          </button>
        </form>

        <p className="text-xs text-center text-on-surface opacity-70 mt-6">
          Ainda nao tem conta?{' '}
          <Link href="/register" className="font-bold text-primary hover:underline">
            Criar conta de agencia
          </Link>
        </p>
        <p className="text-xs text-center text-on-surface opacity-70 mt-3">
          Recebeu uma viagem de uma agencia?{' '}
          <Link href="/traveler/register" className="font-bold text-primary hover:underline">
            Criar conta de viajante
          </Link>
        </p>
      </section>
    </main>
  );
}
