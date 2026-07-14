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
      <span className="text-xs font-bold uppercase tracking-[0.22em] text-white/62">{label}</span>
      <div className="relative">
        <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[21px] text-white/34">
          {icon}
        </span>
        <input
          required
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="input-interactive h-16 w-full rounded-[22px] border border-white/12 bg-white/92 pl-14 pr-14 text-base font-medium text-[#0b1930] placeholder:text-[#78849a] focus:border-[#6FA8DC] focus:bg-white"
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
      eyebrow="Acesso seguro"
      title="Bem-vindo de volta"
      description="Entre na operacao da sua agencia para acompanhar itinerarios, usuarios e configuracoes da experiencia Rumo."
      footer={
        <>
          <p>
            Ainda nao tem conta?{' '}
            <Link href="/register" className="font-semibold text-[#6FA8DC] transition hover:text-white">
              Criar conta de agencia
            </Link>
          </p>
          <p className="mt-2">
            Recebeu uma viagem de uma agencia?{' '}
            <Link href="/traveler/register" className="font-semibold text-[#6FA8DC] transition hover:text-white">
              Criar acesso de viajante
            </Link>
          </p>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthInput
          label="Email ou usuario"
          icon="mail"
          type="email"
          value={formData.email}
          onChange={(value) => setFormData((prev) => ({ ...prev, email: value }))}
          placeholder="consultor@rumo.com"
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-white/62">Senha</span>
            <span className="text-sm font-semibold text-[#6FA8DC]">Ambiente protegido</span>
          </div>
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
                className="flex h-10 w-10 items-center justify-center rounded-full text-[#607089] transition hover:bg-[#eef4fb]"
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            }
          />
        </div>

        {error ? (
          <p className="rounded-[18px] border border-[#ff6b4a]/28 bg-[#ff6b4a]/12 px-4 py-3 text-sm font-semibold text-[#ffd6cd]">
            {error}
          </p>
        ) : null}

        <button
          disabled={loading}
          type="submit"
          className="btn-interactive flex h-16 w-full items-center justify-center gap-3 rounded-[22px] bg-[linear-gradient(135deg,#6FA8DC,#4F8DDA)] px-6 text-base font-bold text-white shadow-[0_14px_40px_rgba(79,141,218,0.35)] transition disabled:cursor-not-allowed disabled:opacity-65"
        >
          <span>{loading ? 'Entrando...' : 'Entrar na plataforma'}</span>
          <span className="material-symbols-outlined text-[22px]">arrow_forward</span>
        </button>
      </form>
    </AuthShell>
  );
}
