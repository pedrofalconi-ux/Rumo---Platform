'use client';

import { useEffect, useState } from 'react';
import { TemplateEditor, type EditorBlock, type EditorDay } from './template-editor';

type Source = 'empty' | 'upload' | 'trip' | 'ai';

const emptyForm = { name: '', destination: '', country: '', suggested_duration_days: 3, budget_range: 'moderate', pace: 'moderate', traveler_profile: 'leisure', status: 'draft', tags: '', allowAiAdaptation: true };

export function TemplateCreatorModal({ open, templateId, onClose, onSaved }: { open: boolean; templateId?: string | null; onClose: () => void; onSaved: () => void; }) {
  const [step, setStep] = useState(1);
  const [source, setSource] = useState<Source>('empty');
  const [form, setForm] = useState(emptyForm);
  const [days, setDays] = useState<EditorDay[]>([{ day_number: 1, title: 'Dia 1', rain_alternatives: '' }]);
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [rules, setRules] = useState<Array<{ rule_type: 'custom'; params: { instruction: string } }>>([]);
  const [file, setFile] = useState<File | null>(null);
  const [sourceTripId, setSourceTripId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('Preparando o modelo...');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (!templateId) { setStep(1); setForm(emptyForm); setDays([{ day_number: 1, title: 'Dia 1', rain_alternatives: '' }]); setBlocks([]); setRules([]); setFile(null); return; }
    setSaving(true);
    fetch(`/api/library/templates/${templateId}`).then(async (response) => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Erro ao carregar modelo');
      setForm({ name: data.name, destination: data.destination, country: data.country, suggested_duration_days: data.suggested_duration_days, budget_range: data.budget_range, pace: data.pace, traveler_profile: data.traveler_profile, status: data.status, tags: (data.tags || []).join(', '), allowAiAdaptation: data.settings?.allowAiAdaptation !== false });
      setDays(data.template_days || []); setBlocks(data.template_blocks || []); setRules(data.template_rules || []); setStep(3);
    }).catch((reason) => setError(reason.message)).finally(() => setSaving(false));
  }, [open, templateId]);

  if (!open) return null;

  const createAiOutline = () => {
    const count = Math.max(1, Number(form.suggested_duration_days) || 3);
    setDays(Array.from({ length: count }, (_, index) => ({ day_number: index + 1, title: `Dia ${index + 1} em ${form.destination || 'Destino'}`, rain_alternatives: '' })));
    setBlocks(Array.from({ length: count * 3 }, (_, index) => ({ day_number: Math.floor(index / 3) + 1, item_order: index % 3, title: index % 3 === 0 ? 'Experiência principal' : index % 3 === 1 ? 'Exploração local' : 'Gastronomia recomendada', description: '', category: index % 3 === 2 ? 'restaurant' : 'activity', period: (['morning','afternoon','night'] as const)[index % 3], is_required: false })));
  };

  const save = async () => {
    setSaving(true); setError(''); setStep(2); setProgress('Salvando estrutura e regras...');
    try {
      const payload: any = { ...form, tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean), settings: { allowAiAdaptation: form.allowAiAdaptation, visibility: 'agency' }, days, blocks, rules, ...(source === 'trip' && sourceTripId ? { sourceTripId } : {}) };
      const response = await fetch(templateId ? `/api/library/templates/${templateId}` : '/api/library/templates', { method: templateId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      let saved = await response.json(); if (!response.ok) throw new Error(saved.error || 'Não foi possível salvar o modelo.');
      if (file) {
        setProgress('Extraindo documento e preparando contexto RAG...');
        const upload = new FormData(); upload.set('templateId', saved.id); upload.set('file', file);
        const importResponse = await fetch('/api/library/templates/import', { method: 'POST', body: upload });
        const imported = await importResponse.json(); if (!importResponse.ok) throw new Error(imported.error || 'Falha ao importar documento.');
        if (imported.blocks?.length) {
          setProgress('Aplicando atividades extraídas...');
          const update = await fetch(`/api/library/templates/${saved.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, days: imported.days, blocks: imported.blocks }) });
          saved = await update.json(); if (!update.ok) throw new Error(saved.error || 'Falha ao aplicar conteúdo extraído.');
          setDays(imported.days); setBlocks(imported.blocks);
        }
      }
      setProgress('Modelo pronto para uso.'); setStep(5); onSaved();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao salvar modelo'); setStep(4); }
    finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#031536]/60 p-3 backdrop-blur-sm"><div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-[#f7f9fd] shadow-2xl">
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-primary/10 bg-white/95 px-6 py-4 backdrop-blur"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-coral">Modelos inteligentes</p><h2 className="text-lg font-black text-primary">{templateId ? 'Editar modelo' : 'Criar novo modelo'}</h2></div><button onClick={onClose} className="rounded-full p-2 hover:bg-ice-blue"><span className="material-symbols-outlined">close</span></button></header>
    <div className="px-6 pt-5"><div className="grid grid-cols-5 gap-2">{['Origem','Processando','Revisão','Configuração','Publicação'].map((label, index) => <div key={label}><div className={`h-1.5 rounded-full ${step >= index + 1 ? 'bg-primary' : 'bg-primary/10'}`}/><p className={`mt-1 text-[8px] font-bold ${step === index + 1 ? 'text-primary' : 'text-on-surface/35'}`}>{label}</p></div>)}</div></div>
    <main className="p-6">
      {step === 1 && <div className="space-y-6"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{([
        ['empty','add_box','Começar vazio','Monte os dias manualmente.'],['upload','upload_file','Importar documento','PDF, Word, Excel ou TXT.'],['trip','luggage','Viagem existente','Converta um roteiro aprovado.'],['ai','auto_awesome','Estrutura por cidade','Crie uma grade inicial econômica.'],
      ] as const).map(([id,icon,title,description]) => <button key={id} onClick={() => setSource(id)} className={`rounded-2xl border p-5 text-left transition ${source === id ? 'border-primary bg-ice-blue shadow-sm' : 'border-outline-variant bg-white hover:border-primary/30'}`}><span className="material-symbols-outlined text-2xl text-primary">{icon}</span><b className="mt-3 block text-xs">{title}</b><span className="mt-1 block text-[10px] text-on-surface/50">{description}</span></button>)}</div>
        <div className="grid gap-3 rounded-2xl border border-primary/10 bg-white p-5 sm:grid-cols-2"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nome do modelo" className="rounded-xl border border-outline-variant p-3 text-xs"/><input value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })} placeholder="Destino principal" className="rounded-xl border border-outline-variant p-3 text-xs"/>{source === 'upload' && <input type="file" accept=".pdf,.docx,.xlsx,.txt" onChange={(event) => setFile(event.target.files?.[0] || null)} className="rounded-xl border border-dashed border-primary/20 p-3 text-xs sm:col-span-2"/>}{source === 'trip' && <input value={sourceTripId} onChange={(event) => setSourceTripId(event.target.value)} placeholder="ID da viagem existente" className="rounded-xl border border-outline-variant p-3 text-xs sm:col-span-2"/>}</div>
        <div className="flex justify-end"><button disabled={form.name.trim().length < 2 || (source === 'upload' && !file) || (source === 'trip' && !sourceTripId)} onClick={() => { if (source === 'ai') createAiOutline(); setStep(3); }} className="rounded-xl bg-primary px-6 py-3 text-xs font-black text-white disabled:opacity-40">Continuar</button></div></div>}
      {step === 2 && <div className="flex min-h-80 flex-col items-center justify-center text-center"><span className="material-symbols-outlined animate-spin text-5xl text-primary">progress_activity</span><h3 className="mt-5 text-lg font-black text-primary">Processando seu modelo</h3><p className="mt-2 text-xs text-on-surface/55">{progress}</p></div>}
      {step === 3 && <div className="space-y-5"><TemplateEditor days={days} blocks={blocks} onDaysChange={setDays} onBlocksChange={setBlocks}/><div className="flex justify-between"><button onClick={() => setStep(1)} className="rounded-xl border px-5 py-3 text-xs font-bold">Voltar</button><button onClick={() => setStep(4)} className="rounded-xl bg-primary px-6 py-3 text-xs font-black text-white">Configurar</button></div></div>}
      {step === 4 && <div className="space-y-5"><div className="grid gap-3 rounded-2xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-3"><select value={form.budget_range} onChange={(event) => setForm({ ...form, budget_range: event.target.value })} className="rounded-xl border p-3 text-xs"><option value="budget">Econômico</option><option value="moderate">Moderado</option><option value="luxury">Luxo</option></select><select value={form.pace} onChange={(event) => setForm({ ...form, pace: event.target.value })} className="rounded-xl border p-3 text-xs"><option value="slow">Ritmo tranquilo</option><option value="moderate">Ritmo equilibrado</option><option value="fast">Ritmo intenso</option></select><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="rounded-xl border p-3 text-xs"><option value="draft">Rascunho</option><option value="published">Publicado</option></select><input value={form.traveler_profile} onChange={(event) => setForm({ ...form, traveler_profile: event.target.value })} placeholder="Perfil do viajante" className="rounded-xl border p-3 text-xs"/><input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="Tags separadas por vírgula" className="rounded-xl border p-3 text-xs sm:col-span-2"/><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={form.allowAiAdaptation} onChange={(event) => setForm({ ...form, allowAiAdaptation: event.target.checked })}/>Permitir adaptação pela IA</label></div><div className="rounded-2xl border bg-white p-5"><p className="text-xs font-black text-primary">Regras da agência</p>{rules.map((rule, index) => <div key={index} className="mt-2 flex gap-2"><input value={String(rule.params.instruction || '')} onChange={(event) => setRules(rules.map((item, position) => position === index ? { ...item, params: { instruction: event.target.value } } : item))} className="flex-1 rounded-xl border p-3 text-xs"/><button onClick={() => setRules(rules.filter((_, position) => position !== index))} className="text-error">×</button></div>)}<button onClick={() => setRules([...rules, { rule_type: 'custom', params: { instruction: '' } }])} className="mt-3 text-[10px] font-bold text-primary">+ Adicionar regra</button></div>{error && <p className="rounded-xl bg-error/10 p-3 text-xs font-bold text-error">{error}</p>}<div className="flex justify-between"><button onClick={() => setStep(3)} className="rounded-xl border px-5 py-3 text-xs font-bold">Voltar</button><button disabled={saving} onClick={save} className="rounded-xl bg-primary px-6 py-3 text-xs font-black text-white disabled:opacity-50">Salvar modelo</button></div></div>}
      {step === 5 && <div className="flex min-h-80 flex-col items-center justify-center text-center"><span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><span className="material-symbols-outlined text-4xl">check</span></span><h3 className="mt-5 text-xl font-black text-primary">Modelo publicado na biblioteca</h3><p className="mt-2 max-w-md text-xs text-on-surface/55">A estrutura, regras, versões e referências já podem orientar novos roteiros.</p><button onClick={onClose} className="mt-6 rounded-xl bg-primary px-6 py-3 text-xs font-black text-white">Voltar à biblioteca</button></div>}
    </main>
  </div></div>;
}
