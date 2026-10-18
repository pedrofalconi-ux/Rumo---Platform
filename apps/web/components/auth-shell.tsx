import Image from 'next/image';
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

const journeySteps = [
  ['Planeje', 'Crie roteiros completos com mais agilidade.'],
  ['Organize', 'Centralize clientes, viagens e operação.'],
  ['Entregue', 'Compartilhe uma experiência clara e elegante.'],
];

export default function AuthShell({
  mode,
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="min-h-dvh bg-[#F8FAFC] text-[#0B1E3A]">
      <div className="grid min-h-dvh lg:grid-cols-[minmax(320px,0.55fr)_minmax(0,1.45fr)]">
        <aside className="relative hidden overflow-hidden bg-[#0B1E3A] px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-14 xl:py-12">
          <Link href="/" className="relative z-10 inline-flex w-fit items-center gap-3" aria-label="Rumo — página inicial">
            <Image src="/rumo-mark-white.svg" alt="" width={40} height={40} priority />
            <Image src="/rumo-logo-white.svg" alt="Rumo" width={97} height={25} priority />
          </Link>

          <div className="relative z-10 my-12 max-w-sm">
            <div className="mb-6 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[#00D4FF]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
                Operação de viagens
              </span>
            </div>
            <h2 className="text-4xl font-extrabold leading-[1.08] tracking-[-0.045em] xl:text-[46px]">
              Sua operação, em uma direção.
            </h2>
            <p className="mt-5 text-sm leading-6 text-white/62 xl:text-base xl:leading-7">
              Da primeira ideia ao embarque, a Rumo mantém cada etapa clara, conectada e pronta para avançar.
            </p>

            <ol className="mt-10 space-y-5">
              {journeySteps.map(([label, text], index) => (
                <li key={label} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#2E8BFF]/55 bg-[#102B50] text-[10px] font-extrabold text-[#00D4FF]">
                      {index + 1}
                    </span>
                    {index < journeySteps.length - 1 ? <span className="mt-1 h-full w-px bg-white/12" /> : null}
                  </div>
                  <div className="pb-1">
                    <p className="text-sm font-bold text-white">{label}</p>
                    <p className="mt-1 text-xs leading-5 text-white/52">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <p className="relative z-10 text-xs text-white/42">Rumo · A sua bússola</p>

          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full border border-[#2E8BFF]/18" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-12 -right-12 h-48 w-48 rounded-full border border-[#00D4FF]/12" />
        </aside>

        <section className="flex min-w-0 items-center justify-center px-4 py-8 sm:px-8 lg:px-12 xl:px-16">
          <div className={`w-full ${mode === 'register' ? 'max-w-[760px]' : 'max-w-[520px]'}`}>
            <Link href="/" className="mb-8 inline-flex items-center gap-3 lg:hidden" aria-label="Rumo — página inicial">
              <Image src="/rumo-mark.svg" alt="" width={40} height={40} priority />
              <Image src="/rumo-logo.svg" alt="Rumo" width={97} height={25} priority />
            </Link>

            <div className="rounded-[24px] border border-[#E9EEF4] bg-white p-6 shadow-[0_16px_40px_rgba(11,30,58,0.055)] sm:p-9 xl:p-10">
              <div className="flex items-center gap-2 text-[#2E8BFF]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00D4FF]" />
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em]">{eyebrow}</p>
              </div>
              <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.045em] text-[#0B1E3A] sm:text-[38px] sm:leading-tight">
                {title}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#526176]">{description}</p>

              <div className="mt-8">{children}</div>
              <div className="mt-7 border-t border-[#E9EEF4] pt-6 text-sm leading-6 text-[#66758A]">{footer}</div>
            </div>

            <p className="mt-5 text-center text-xs text-[#8190A3]">Ambiente seguro para a operação da sua agência</p>
          </div>
        </section>
      </div>
    </main>
  );
}
