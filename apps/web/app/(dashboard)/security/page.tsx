'use client';

export default function SecurityPage() {
  return (
    <div className="flex-1 space-y-6">
      <div>
        <h2 className="font-headline-lg text-2xl font-bold text-primary tracking-tight">SEGURANCA & RASTREAMENTO</h2>
        <p className="text-on-surface opacity-75 text-sm mt-1">
          Modulo em construcao dentro da plataforma Rumo.
        </p>
      </div>

      <section className="relative min-h-[650px] overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm">
        <div className="absolute inset-0 blur-[5px] opacity-45 pointer-events-none select-none">
          <div className="grid grid-cols-12 gap-6 h-full p-6">
            <div className="col-span-12 lg:col-span-4 border border-outline-variant rounded-xl p-4 bg-surface-container-low">
              <div className="h-4 w-36 rounded bg-primary/25 mb-5" />
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="mb-3 rounded-xl border border-outline-variant bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-28 rounded bg-primary/25" />
                    <div className="h-5 w-14 rounded-full bg-coral/25" />
                  </div>
                  <div className="mt-4 h-3 w-44 rounded bg-sky-compass/25" />
                </div>
              ))}
            </div>

            <div className="col-span-12 lg:col-span-8 rounded-xl border border-outline-variant bg-ice-blue relative overflow-hidden">
              <div className="absolute inset-0">
                <svg className="h-full w-full text-sky-compass/30" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="security-preview-grid" width="42" height="42" patternUnits="userSpaceOnUse">
                      <path d="M 42 0 L 0 0 0 42" fill="none" stroke="currentColor" strokeWidth="0.6" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#security-preview-grid)" />
                  <path d="M60 170 Q140 80 240 135 T430 210 T640 150 T820 280 L900 520 L60 520 Z" fill="#EAF3DE" opacity="0.7" />
                </svg>
              </div>
              <div className="absolute left-[28%] top-[36%] h-8 w-8 rounded-full bg-primary shadow-lg" />
              <div className="absolute left-[58%] top-[52%] h-8 w-8 rounded-full bg-coral shadow-lg" />
              <div className="absolute left-[72%] top-[31%] h-8 w-8 rounded-full bg-primary shadow-lg" />
            </div>
          </div>
        </div>

        <div className="absolute inset-0 bg-white/55 backdrop-blur-[2px]" />

        <div className="relative z-10 flex min-h-[650px] items-center justify-center p-6">
          <div className="max-w-xl text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-on-primary shadow-xl shadow-primary/20">
              <span className="material-symbols-outlined text-[42px]">construction</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-coral">Em breve...</p>
            <h3 className="mt-3 text-2xl font-bold text-primary">Central de seguranca em construcao</h3>
            <p className="mt-3 text-sm leading-relaxed text-on-surface opacity-75">
              Spoiler: vai ser aqui que a agencia podera acompanhar a localizacao de um cliente que esta em viagem, com contexto da trip, ultimo sinal e informacoes operacionais para suporte em tempo real.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
