'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import AuthShell from '../../../components/auth-shell';

function Field({
  label,
  icon,
  type = 'text',
  value,
  placeholder,
  onChange,
  trailing,
}: {
  label: string;
  icon: string;
  type?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
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
          className="input-interactive h-14 w-full rounded-[20px] border border-white/12 bg-white/92 pl-14 pr-14 text-base font-medium text-[#0b1930] placeholder:text-[#78849a] focus:border-[#6FA8DC] focus:bg-white"
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
      setError('Os e-mails informados nao conferem.');
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
        setError(data.error || 'Nao foi possivel criar a conta.');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Erro de conexao ao tentar criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      mode="register"
      eyebrow="Onboarding de agencias"
      title="Estruture sua operacao"
      description="Crie o tenant da sua agencia, configure o administrador inicial e entre em um fluxo preparado para escala, governanca e experiencia premium."
      footer={
        <>
          <p>
            Ja possui acesso?{' '}
            <Link href="/login" className="font-semibold text-[#6FA8DC] transition hover:text-white">
              Entrar na plataforma
            </Link>
          </p>
          <p className="mt-2">
            Sou viajante convidado por uma agencia.{' '}
            <Link href="/traveler/register" className="font-semibold text-[#6FA8DC] transition hover:text-white">
              Criar acesso de viajante
            </Link>
          </p>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Nome completo"
            icon="person"
            value={formData.fullName}
            onChange={(value) => setFormData((prev) => ({ ...prev, fullName: value }))}
            placeholder="Responsavel pela operacao"
          />
          <Field
            label="Nome da agencia"
            icon="apartment"
            value={formData.agencyName}
            onChange={(value) => setFormData((prev) => ({ ...prev, agencyName: value }))}
            placeholder="Rumo Viagens"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="E-mail"
            icon="mail"
            type="email"
            value={formData.email}
            onChange={(value) => setFormData((prev) => ({ ...prev, email: value }))}
            placeholder="operacao@agencia.com"
          />
          <Field
            label="Confirmar e-mail"
            icon="forward_to_inbox"
            type="email"
            value={formData.emailConfirm}
            onChange={(value) => setFormData((prev) => ({ ...prev, emailConfirm: value }))}
            placeholder="Repita o e-mail"
          />
        </div>

        <Field
          label="Telefone"
          icon="call"
          value={formData.phone}
          onChange={(value) => setFormData((prev) => ({ ...prev, phone: value }))}
          placeholder="+55 11 99999-9999"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Senha"
            icon="lock"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(value) => setFormData((prev) => ({ ...prev, password: value }))}
            placeholder="Minimo de 6 caracteres"
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
          <Field
            label="Chave de acesso"
            icon="key"
            type={showAccessKey ? 'text' : 'password'}
            value={formData.accessKey}
            onChange={(value) => setFormData((prev) => ({ ...prev, accessKey: value }))}
            placeholder="Chave fornecida pela Rumo"
            trailing={
              <button
                type="button"
                onClick={() => setShowAccessKey((value) => !value)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[#607089] transition hover:bg-[#eef4fb]"
                title={showAccessKey ? 'Ocultar chave' : 'Mostrar chave'}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showAccessKey ? 'visibility_off' : 'visibility'}
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
          <span>{loading ? 'Criando ambiente...' : 'Criar conta da agencia'}</span>
          <span className="material-symbols-outlined text-[22px]">arrow_forward</span>
        </button>
      </form>
    </AuthShell>
  );
}
