'use client';

import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import AuthShell from '../../../components/auth-shell';

function AuthInput({
  label,
  Icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  trailing,
}: {
  label: string;
  Icon: LucideIcon;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-bold text-[#33445C]">{label}</span>
      <div className="relative">
        <Icon aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8190A3]" />
        <input
          required
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="input-interactive h-13 w-full rounded-xl border border-[#E9EEF4] bg-white pl-12 pr-14 text-sm font-medium text-[#0B1E3A] placeholder:text-[#A2ADBB] hover:border-[#C9D5E2] focus:border-[#2E8BFF] focus:bg-white"
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
        setError(data.error || 'Não foi possível entrar.');
        return;
      }

      router.push(data.user?.role === 'traveler' ? '/app/trips' : '/dashboard');
      router.refresh();
    } catch {
      setError('Erro de conexão ao tentar entrar.');
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
            <Link href="/register" className="font-bold text-[#2E8BFF] transition-colors hover:text-[#0B1E3A]">
              Criar conta
            </Link>
          </p>
          <p className="mt-1">
            É viajante?{' '}
            <Link href="/traveler/register" className="font-semibold text-[#2E8BFF] transition-colors hover:text-[#0B1E3A]">
              Acessar convite de viagem
            </Link>
          </p>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          label="E-mail"
          Icon={Mail}
          type="email"
          value={formData.email}
          onChange={(value) => setFormData((prev) => ({ ...prev, email: value }))}
          placeholder="voce@suaagencia.com"
          autoComplete="username"
        />

        <AuthInput
          label="Senha"
          Icon={LockKeyhole}
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={(value) => setFormData((prev) => ({ ...prev, password: value }))}
          placeholder="Digite sua senha"
          autoComplete="current-password"
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8190A3] transition-colors hover:bg-[#F1F7FF] hover:text-[#2E8BFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E8BFF]"
              title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff aria-hidden="true" className="h-[18px] w-[18px]" /> : <Eye aria-hidden="true" className="h-[18px] w-[18px]" />}
            </button>
          }
        />

        {error ? (
          <p role="alert" className="rounded-xl border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-sm font-semibold text-[#B42318]">
            {error}
          </p>
        ) : null}

        <button
          disabled={loading}
          type="submit"
          aria-busy={loading}
          className="btn-interactive mt-2 flex h-13 w-full items-center justify-center gap-3 rounded-xl bg-[#2E8BFF] px-6 text-sm font-extrabold text-white hover:bg-[#1F73DF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E8BFF] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{loading ? 'Entrando...' : 'Entrar'}</span>
          <ArrowRight aria-hidden="true" className="h-5 w-5" />
        </button>
      </form>
    </AuthShell>
  );
}
