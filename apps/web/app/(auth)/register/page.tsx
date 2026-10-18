'use client';

import { ArrowRight, Building2, Eye, EyeOff, KeyRound, LockKeyhole, Mail, Phone, UserRound, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import AuthShell from '../../../components/auth-shell';
import { formatBrazilianPhone } from '../../../lib/phone';

function Field({
  label,
  Icon,
  type = 'text',
  value,
  placeholder,
  onChange,
  autoComplete,
  trailing,
}: {
  label: string;
  Icon: LucideIcon;
  type?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
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
          className="input-interactive h-13 w-full rounded-xl border border-[#E9EEF4] bg-white pl-12 pr-14 text-sm font-medium text-[#0B1E3A] placeholder:text-[#A2ADBB] hover:border-[#C9D5E2] focus:border-[#2E8BFF]"
        />
        {trailing ? <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div> : null}
      </div>
    </label>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    agencyName: '',
    email: '',
    emailConfirm: '',
    phone: '',
    password: '',
    accessKey: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAccessKey, setShowAccessKey] = useState(false);

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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Não foi possível criar a conta.');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Erro de conexão ao tentar criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      mode="register"
      eyebrow="Comece agora"
      title="Crie sua conta"
      description="Configure sua agência e dê o primeiro passo para uma operação mais simples e conectada."
      footer={
        <>
          <p>
            Já possui acesso?{' '}
            <Link href="/login" className="font-bold text-[#2E8BFF] transition-colors hover:text-[#0B1E3A]">
              Entrar
            </Link>
          </p>
          <p className="mt-2">
            É viajante convidado?{' '}
            <Link href="/traveler/register" className="font-semibold text-[#2E8BFF] transition-colors hover:text-[#0B1E3A]">
              Acessar convite
            </Link>
          </p>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Nome completo"
            Icon={UserRound}
            value={formData.fullName}
            onChange={(value) => setFormData((prev) => ({ ...prev, fullName: value }))}
            placeholder="Responsável pela operação"
            autoComplete="name"
          />
          <Field
            label="Nome da agência"
            Icon={Building2}
            value={formData.agencyName}
            onChange={(value) => setFormData((prev) => ({ ...prev, agencyName: value }))}
            placeholder="Rumo Viagens"
            autoComplete="organization"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="E-mail"
            Icon={Mail}
            type="email"
            value={formData.email}
            onChange={(value) => setFormData((prev) => ({ ...prev, email: value }))}
            placeholder="operacao@agencia.com"
            autoComplete="email"
          />
          <Field
            label="Confirmar e-mail"
            Icon={Mail}
            type="email"
            value={formData.emailConfirm}
            onChange={(value) => setFormData((prev) => ({ ...prev, emailConfirm: value }))}
            placeholder="Repita o e-mail"
            autoComplete="email"
          />
        </div>

        <Field
          label="Telefone"
          Icon={Phone}
          type="tel"
          value={formData.phone}
          onChange={(value) => setFormData((prev) => ({ ...prev, phone: formatBrazilianPhone(value) }))}
          placeholder="(11) 99999-9999"
          autoComplete="tel"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Senha"
            Icon={LockKeyhole}
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(value) => setFormData((prev) => ({ ...prev, password: value }))}
            placeholder="Mínimo de 6 caracteres"
            autoComplete="new-password"
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
          <Field
            label="Chave de acesso"
            Icon={KeyRound}
            type={showAccessKey ? 'text' : 'password'}
            value={formData.accessKey}
            onChange={(value) => setFormData((prev) => ({ ...prev, accessKey: value }))}
            placeholder="Chave fornecida pela Rumo"
            autoComplete="off"
            trailing={
              <button
                type="button"
                onClick={() => setShowAccessKey((value) => !value)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8190A3] transition-colors hover:bg-[#F1F7FF] hover:text-[#2E8BFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E8BFF]"
                title={showAccessKey ? 'Ocultar chave' : 'Mostrar chave'}
                aria-label={showAccessKey ? 'Ocultar chave' : 'Mostrar chave'}
              >
                {showAccessKey ? <EyeOff aria-hidden="true" className="h-[18px] w-[18px]" /> : <Eye aria-hidden="true" className="h-[18px] w-[18px]" />}
              </button>
            }
          />
        </div>

        {error ? (
          <p role="alert" className="rounded-xl border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-sm font-semibold text-[#B42318]">
            {error}
          </p>
        ) : null}

        <button
          disabled={loading}
          type="submit"
          aria-busy={loading}
          className="btn-interactive flex h-13 w-full items-center justify-center gap-3 rounded-xl bg-[#2E8BFF] px-6 text-sm font-extrabold text-white hover:bg-[#1F73DF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E8BFF] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{loading ? 'Criando ambiente...' : 'Criar conta da agência'}</span>
          <ArrowRight aria-hidden="true" className="h-5 w-5" />
        </button>
      </form>
    </AuthShell>
  );
}
