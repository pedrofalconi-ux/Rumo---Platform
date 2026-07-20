'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import AuthShell from '../../../components/auth-shell';

function AuthInput({
  label,
  icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  trailing,
}: {
  label: string;
  icon: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-[11px] font-bold text-on-surface/70">{label}</span>
      <div className="relative">
        <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-primary/45">
          {icon}
        </span>
        <input
          required
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="input-interactive h-14 w-full rounded-2xl border border-primary/15 bg-white pl-12 pr-14 text-sm font-medium text-on-surface shadow-sm placeholder:text-on-surface/35 focus:border-primary focus:bg-white"
        />
        {trailing ? <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div> : null}
      </div>
    </label>
  );
}

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
    <AuthShell
      mode="login"
      eyebrow="Área do cliente"
      title="Bem-vindo de volta"
      description="Acesse sua conta e continue organizando viagens inesquecíveis."
      footer={
        <>
          <p>
            Ainda não usa a Rumo?{' '}
            <Link href="/register" className="font-bold text-primary transition hover:text-coral">
              Criar conta
            </Link>
          </p>
          <p className="mt-1">
            É viajante?{' '}
            <Link href="/traveler/register" className="font-semibold text-primary transition hover:text-coral">
              Acessar convite de viagem
            </Link>
          </p>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          label="Email ou usuario"
          icon="mail"
          type="email"
          value={formData.email}
          onChange={(value) => setFormData((prev) => ({ ...prev, email: value }))}
          placeholder="consultor@rumo.com"
        />

        <AuthInput
          label="Senha"
          icon="lock"
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={(value) => setFormData((prev) => ({ ...prev, password: value }))}
          placeholder="Digite sua senha"
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-primary/55 transition hover:bg-primary/5 hover:text-primary"
              title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              <span className="material-symbols-outlined text-[19px]">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          }
        />

        {error ? (
          <p className="rounded-2xl border border-coral/25 bg-coral/10 px-4 py-3 text-sm font-semibold text-[#9A3D20]">
            {error}
          </p>
        ) : null}

        <button
          disabled={loading}
          type="submit"
          className="btn-interactive mt-2 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-primary px-6 text-sm font-black text-white shadow-[0_12px_28px_rgba(24,59,78,0.2)] transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-65"
        >
          <span>{loading ? 'Entrando...' : 'Entrar'}</span>
          <span className="material-symbols-outlined text-[22px]">arrow_forward</span>
        </button>
      </form>
    </AuthShell>
  );
}
