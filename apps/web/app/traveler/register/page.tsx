'use client';

import { ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, Mail, Phone, UserRound, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useState } from 'react';
import AuthShell from '../../../components/auth-shell';
import { formatBrazilianPhone } from '../../../lib/phone';

function TravelerField({
  label,
  Icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  required = true,
  minLength,
  trailing,
}: {
  label: string;
  Icon: LucideIcon;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  trailing?: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-bold text-[#33445C]">{label}</span>
      <div className="relative">
        <Icon aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8190A3]" />
        <input
          required={required}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          className="input-interactive h-13 w-full rounded-xl border border-[#E9EEF4] bg-white pl-12 pr-14 text-sm font-medium text-[#0B1E3A] placeholder:text-[#A2ADBB] hover:border-[#C9D5E2] focus:border-[#13315C]"
        />
        {trailing ? <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div> : null}
      </div>
    </label>
  );
}

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
      setError('Os e-mails informados não conferem.');
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
        setError(data.error || 'Não foi possível criar sua conta.');
        return;
      }

      router.push('/app/trips');
      router.refresh();
    } catch {
      setError('Erro de conexão ao criar sua conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      mode="register"
      eyebrow="Área do viajante"
      title="Acesse sua próxima viagem"
      description="Use o convite enviado pela sua agência para reunir roteiro e informações da viagem em um só lugar."
      footer={
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/login" className="font-bold text-[#13315C] transition-colors hover:text-[#2A5793]">
            Já tenho conta
          </Link>
          <Link href="/register" className="font-semibold text-[#13315C] transition-colors hover:text-[#2A5793]">
            Sou uma agência
          </Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TravelerField
            label="Nome completo"
            Icon={UserRound}
            value={formData.fullName}
            onChange={(value) => setFormData((previous) => ({ ...previous, fullName: value }))}
            placeholder="Como deseja ser chamado"
            autoComplete="name"
          />
          <TravelerField
            label="Telefone"
            Icon={Phone}
            type="tel"
            value={formData.phone}
            onChange={(value) => setFormData((previous) => ({ ...previous, phone: formatBrazilianPhone(value) }))}
            placeholder="(11) 99999-9999"
            autoComplete="tel"
            required={false}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TravelerField
            label="E-mail"
            Icon={Mail}
            type="email"
            value={formData.email}
            onChange={(value) => setFormData((previous) => ({ ...previous, email: value }))}
            placeholder="voce@email.com"
            autoComplete="email"
          />
          <TravelerField
            label="Confirmar e-mail"
            Icon={Mail}
            type="email"
            value={formData.emailConfirm}
            onChange={(value) => setFormData((previous) => ({ ...previous, emailConfirm: value }))}
            placeholder="Repita o e-mail"
            autoComplete="email"
          />
        </div>

        <TravelerField
          label="Link ou código do convite"
          Icon={KeyRound}
          value={formData.inviteToken}
          onChange={(value) => setFormData((previous) => ({ ...previous, inviteToken: value }))}
          placeholder="Cole o convite enviado pela agência"
          autoComplete="off"
        />

        <TravelerField
          label="Senha"
          Icon={LockKeyhole}
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={(value) => setFormData((previous) => ({ ...previous, password: value }))}
          placeholder="Mínimo de 6 caracteres"
          autoComplete="new-password"
          minLength={6}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8190A3] transition-colors hover:bg-[#EEF2F9] hover:text-[#13315C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#13315C]"
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
          className="btn-interactive flex h-13 w-full items-center justify-center gap-3 rounded-xl bg-[#13315C] px-6 text-sm font-extrabold text-white hover:bg-[#0C2444] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#13315C] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{loading ? 'Criando conta...' : 'Criar conta de viajante'}</span>
          <ArrowRight aria-hidden="true" className="h-5 w-5" />
        </button>
      </form>
    </AuthShell>
  );
}

export default function TravelerRegisterPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-[#F8FAFC]" />}>
      <TravelerRegisterContent />
    </Suspense>
  );
}
