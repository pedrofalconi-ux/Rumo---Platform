import Link from 'next/link';
import type { ReactNode } from 'react';

type AuthMode = 'login' | 'register';

interface AuthShellProps {
  mode: AuthMode;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

const leftPanelItems = [
  {
    icon: '</>',
    title: 'Roteiros que ganham vida',
    text: 'Operacao, curadoria e experiencia do viajante conectadas em um unico cockpit.',
  },
  {
    icon: '{}',
    title: 'SaaS com isolamento por agencia',
    text: 'Tenant, usuarios, configuracoes e jornadas pensadas para escala real em producao.',
  },
  {
    icon: 'near_me',
    title: 'Bussola operacional',
    text: 'A Rumo organiza o caminho do consultor desde a criacao do itinerario ate a entrega final.',
  },
];

function AuthTab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`flex-1 rounded-2xl px-4 py-3 text-center text-sm font-semibold transition-all ${
        active
          ? 'bg-[linear-gradient(135deg,#6FA8DC,#4F8DDA)] text-white shadow-[0_0_28px_rgba(111,168,220,0.35)]'
          : 'text-white/60 hover:text-white'
      }`}
    >
      {label}
    </Link>
  );
}

export default function AuthShell({
  mode,
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="auth-canvas min-h-screen overflow-hidden px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="auth-grid mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[1640px] overflow-hidden rounded-[32px] border border-white/10 bg-[#04162d]/90 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur">
        <section className="auth-brand-panel relative hidden min-h-full flex-1 overflow-hidden border-r border-white/8 xl:flex">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(111,168,220,0.24),transparent_38%),radial-gradient(circle_at_70%_72%,rgba(255,107,74,0.12),transparent_32%),linear-gradient(180deg,rgba(3,20,43,0.86),rgba(1,9,22,0.98))]" />
          <div className="auth-grid-pattern absolute inset-0 opacity-70" />

          <div className="relative z-10 flex w-full flex-col justify-between p-10 2xl:p-14">
            <div className="flex items-start justify-between gap-6 text-white/45">
              <div className="space-y-2 font-mono text-sm leading-7">
                <p>// Rumo Control Center</p>
                <p>const tenant = 'agencia';</p>
                <p>const travelers = embarcar();</p>
                <p>const experiencia = elevar();</p>
              </div>
              <div className="space-y-1 text-right font-mono text-sm leading-7">
                <p>{'<Rumo />'}</p>
                <p>{'<Operacao />'}</p>
                <p>{'<Experiencia />'}</p>
              </div>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="auth-brand-mark flex h-28 w-28 items-center justify-center rounded-[30px] border border-[#6FA8DC]/35 bg-[linear-gradient(180deg,rgba(12,45,84,0.96),rgba(7,22,42,0.92))] shadow-[0_0_40px_rgba(111,168,220,0.18)]">
                <img src="/rumo-mark.svg" alt="Rumo" className="h-20 w-20" />
              </div>
              <img src="/rumo-logo.svg" alt="Rumo" className="mt-8 h-auto w-[320px] max-w-full" />
              <p className="mt-8 text-base text-white/76">bem-vindo ao</p>
              <h2 className="mt-2 text-[44px] font-black tracking-[-0.04em] text-[#6FA8DC]">
                Rumo Operations
              </h2>
              <div className="mt-7 flex items-center gap-4 text-[#6FA8DC]">
                <span className="h-px w-20 bg-white/18" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#6FA8DC]" />
                <span className="h-px w-20 bg-white/18" />
              </div>
              <p className="mt-8 max-w-xl text-4xl font-black leading-tight tracking-[-0.04em] text-white">
                Inteligencia operacional para agencias que querem vender com elegancia e escalar com controle.
              </p>
              <p className="mt-5 max-w-lg text-lg leading-8 text-white/68">
                A plataforma centraliza itinerarios, usuarios, configuracoes de tenant e experiencia do viajante em um
                fluxo desenhado para producao.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3">
              {leftPanelItems.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[26px] border border-white/10 bg-white/5 px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#6FA8DC]/35 bg-[#092646] text-lg font-semibold text-[#6FA8DC]">
                    {item.icon === 'near_me' ? (
                      <span className="material-symbols-outlined text-[22px]">near_me</span>
                    ) : (
                      item.icon
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/62">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="auth-form-panel relative flex w-full flex-1 items-center justify-center overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(111,168,220,0.12),transparent_30%),radial-gradient(circle_at_bottom,rgba(255,107,74,0.08),transparent_28%),linear-gradient(180deg,#07192f,#041224)]" />
          <div className="relative z-10 w-full max-w-[720px] px-6 py-10 sm:px-10 lg:px-14">
            <div className="mx-auto max-w-[640px]">
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#6FA8DC]">{eyebrow}</p>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">{title}</h1>
              <p className="mt-4 max-w-[540px] text-base leading-7 text-white/64">{description}</p>

              <div className="mt-8 flex rounded-[24px] border border-white/12 bg-white/6 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <AuthTab href="/login" active={mode === 'login'} label="Entrar" />
                <AuthTab href="/register" active={mode === 'register'} label="Cadastrar" />
              </div>

              <div className="mt-8 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-8">
                {children}
                <div className="mt-8 border-t border-white/10 pt-6 text-sm text-white/58">{footer}</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
