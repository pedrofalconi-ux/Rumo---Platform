'use client';

export interface TemplateSummary {
  id: string;
  name: string;
  destination: string;
  country: string;
  suggested_duration_days: number;
  budget_range: string;
  pace: string;
  traveler_profile: string;
  status: string;
  tags: string[];
  updated_at: string;
  block_count: number;
  restaurant_count: number;
  required_count: number;
  document_count: number;
}

export function TemplateCard({ template, onEdit, onDuplicate, onArchive }: {
  template: TemplateSummary;
  onEdit: (template: TemplateSummary) => void;
  onDuplicate: (template: TemplateSummary) => void;
  onArchive: (template: TemplateSummary) => void;
}) {
  const budget = { budget: 'Econômico', moderate: 'Moderado', luxury: 'Luxo' }[template.budget_range] || template.budget_range;
  return <article className="group overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
    <div className="relative h-28 bg-gradient-to-br from-[#082354] via-[#0c45c8] to-[#3478f6] p-5 text-white">
      <div className="flex items-start justify-between gap-3"><span className="rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider backdrop-blur">{template.status === 'published' ? 'Publicado' : template.status === 'archived' ? 'Arquivado' : 'Rascunho'}</span><span className="material-symbols-outlined text-white/70">route</span></div>
      <h3 className="mt-4 truncate text-base font-black">{template.name}</h3>
      <p className="mt-1 truncate text-[10px] text-white/70">{[template.destination, template.country].filter(Boolean).join(', ') || 'Destino flexível'}</p>
    </div>
    <div className="space-y-4 p-5">
      <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-ice-blue p-2"><b className="block text-sm text-primary">{template.suggested_duration_days}</b><span className="text-[9px] text-on-surface/50">dias</span></div><div className="rounded-xl bg-ice-blue p-2"><b className="block text-sm text-primary">{template.block_count}</b><span className="text-[9px] text-on-surface/50">atividades</span></div><div className="rounded-xl bg-ice-blue p-2"><b className="block text-sm text-primary">{template.restaurant_count}</b><span className="text-[9px] text-on-surface/50">refeições</span></div></div>
      <div className="flex flex-wrap gap-1.5"><span className="rounded-full border border-primary/10 px-2 py-1 text-[9px] font-bold text-primary">{budget}</span><span className="rounded-full border border-primary/10 px-2 py-1 text-[9px] font-bold text-primary">{template.traveler_profile}</span>{template.document_count > 0 && <span className="rounded-full bg-coral/10 px-2 py-1 text-[9px] font-bold text-coral">{template.document_count} docs RAG</span>}</div>
      <p className="text-[9px] text-on-surface/40">Atualizado em {new Date(template.updated_at).toLocaleDateString('pt-BR')}</p>
      <div className="grid grid-cols-[1fr_auto_auto] gap-2"><a href={`/trips/new?template=${template.id}`} className="rounded-xl bg-primary px-3 py-2.5 text-center text-[10px] font-black text-white">Usar modelo</a><button onClick={() => onEdit(template)} title="Editar" className="rounded-xl border border-outline-variant px-3 text-primary hover:bg-ice-blue"><span className="material-symbols-outlined text-[17px]">edit</span></button><details className="relative"><summary className="flex h-full cursor-pointer list-none items-center rounded-xl border border-outline-variant px-3 text-primary"><span className="material-symbols-outlined text-[17px]">more_horiz</span></summary><div className="absolute bottom-11 right-0 z-30 w-36 rounded-xl border bg-white p-1 shadow-xl"><button onClick={() => onDuplicate(template)} className="w-full rounded-lg px-3 py-2 text-left text-[10px] font-bold hover:bg-ice-blue">Duplicar</button><button onClick={() => navigator.clipboard?.writeText(`${location.origin}/library?template=${template.id}`)} className="w-full rounded-lg px-3 py-2 text-left text-[10px] font-bold hover:bg-ice-blue">Compartilhar link</button><button onClick={() => onArchive(template)} className="w-full rounded-lg px-3 py-2 text-left text-[10px] font-bold text-error hover:bg-error/5">Arquivar</button></div></details></div>
    </div>
  </article>;
}
