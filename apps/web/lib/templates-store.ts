import 'server-only';

import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const admin = url && serviceKey
  ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

export type TemplatePeriod = 'morning' | 'afternoon' | 'night' | 'any';

export interface TemplateDayInput {
  id?: string;
  day_number: number;
  title?: string;
  rain_alternatives?: string;
  meals_recommendation?: Array<Record<string, unknown>>;
}

export interface TemplateBlockInput {
  id?: string;
  day_number: number;
  item_order?: number;
  title: string;
  description?: string;
  category?: string;
  poi_id?: string | null;
  period?: TemplatePeriod;
  duration_minutes?: number | null;
  is_required?: boolean;
  estimated_cost?: number | null;
  agency_notes?: string;
  ai_instructions?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface TemplateRuleInput {
  id?: string;
  rule_type: 'dont_combine' | 'max_distance' | 'restricted_age' | 'required' | 'custom';
  params?: Record<string, unknown>;
}

export interface TemplateInput {
  name: string;
  destination?: string;
  country?: string;
  suggested_duration_days?: number;
  budget_range?: 'budget' | 'moderate' | 'luxury';
  pace?: 'slow' | 'moderate' | 'fast';
  traveler_profile?: string;
  language?: string;
  status?: 'draft' | 'published' | 'archived';
  tags?: string[];
  settings?: Record<string, unknown>;
  parent_template_id?: string | null;
  days?: TemplateDayInput[];
  blocks?: TemplateBlockInput[];
  rules?: TemplateRuleInput[];
}

export interface TemplateFilters {
  destination?: string;
  profile?: string;
  budget?: string;
  status?: string;
  duration?: number;
  search?: string;
  tags?: string[];
}

function requireAdmin() {
  if (!admin) throw new Error('Persistência de modelos indisponível. Configure o Supabase no servidor.');
  return admin;
}

function isMissingTable(error: { code?: string; message?: string } | null) {
  return error?.code === '42P01' || error?.code === 'PGRST205' || /itinerary_templates.*not found/i.test(error?.message || '');
}

function templateRow(input: TemplateInput, agencyId: string, userId: string) {
  return {
    agency_id: agencyId,
    name: input.name.trim(),
    destination: input.destination?.trim() || '',
    country: input.country?.trim() || '',
    suggested_duration_days: Math.min(120, Math.max(1, Number(input.suggested_duration_days) || 1)),
    budget_range: input.budget_range || 'moderate',
    pace: input.pace || 'moderate',
    traveler_profile: input.traveler_profile?.trim() || 'leisure',
    language: input.language || 'pt-BR',
    status: input.status || 'draft',
    tags: Array.from(new Set((input.tags || []).map((tag) => tag.trim()).filter(Boolean))).slice(0, 20),
    settings: input.settings || { allowAiAdaptation: true, visibility: 'agency' },
    parent_template_id: input.parent_template_id || null,
    created_by: userId,
  };
}

export async function listTemplates(agencyId: string, filters: TemplateFilters = {}) {
  const client = requireAdmin();
  let query = client
    .from('itinerary_templates')
    .select('*, template_blocks(id,category,is_required), template_documents(id,embedding_status)')
    .eq('agency_id', agencyId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (filters.destination) query = query.ilike('destination', `%${filters.destination}%`);
  if (filters.profile) query = query.eq('traveler_profile', filters.profile);
  if (filters.budget) query = query.eq('budget_range', filters.budget);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.duration) query = query.eq('suggested_duration_days', filters.duration);
  if (filters.search) query = query.or(`name.ilike.%${filters.search}%,destination.ilike.%${filters.search}%`);
  if (filters.tags?.length) query = query.contains('tags', filters.tags);

  const { data, error } = await query.limit(100);
  if (isMissingTable(error)) return [];
  if (error) throw new Error(`Falha ao listar modelos: ${error.message}`);
  return (data || []).map((template: any) => ({
    ...template,
    block_count: template.template_blocks?.length || 0,
    restaurant_count: template.template_blocks?.filter((block: any) => /restaurant|restaurante|meal/i.test(block.category)).length || 0,
    required_count: template.template_blocks?.filter((block: any) => block.is_required).length || 0,
    document_count: template.template_documents?.length || 0,
    template_blocks: undefined,
    template_documents: undefined,
  }));
}

async function getRawTemplate(id: string, agencyId: string) {
  const client = requireAdmin();
  const { data, error } = await client
    .from('itinerary_templates')
    .select('*, template_days(*), template_blocks(*), template_rules(*), template_documents(*), template_versions(id,version_number,version_label,changes_summary,created_at)')
    .eq('id', id)
    .eq('agency_id', agencyId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(`Falha ao carregar modelo: ${error.message}`);
  return data;
}

function mergeInherited(parent: any, child: any) {
  if (!parent) return child;
  const childBlockKeys = new Set((child.template_blocks || []).map((block: any) => `${block.day_number}:${block.item_order}`));
  const childDays = new Set((child.template_days || []).map((day: any) => day.day_number));
  return {
    ...parent,
    ...child,
    inherited_from: parent.id,
    template_days: [
      ...(parent.template_days || []).filter((day: any) => !childDays.has(day.day_number)),
      ...(child.template_days || []),
    ].sort((a: any, b: any) => a.day_number - b.day_number),
    template_blocks: [
      ...(parent.template_blocks || []).filter((block: any) => !childBlockKeys.has(`${block.day_number}:${block.item_order}`)),
      ...(child.template_blocks || []),
    ].sort((a: any, b: any) => a.day_number - b.day_number || a.item_order - b.item_order),
    template_rules: [...(parent.template_rules || []), ...(child.template_rules || [])],
  };
}

export async function getTemplate(id: string, agencyId: string, resolveInheritance = true) {
  const template = await getRawTemplate(id, agencyId);
  if (!template || !resolveInheritance || !template.parent_template_id) return template;
  const parent = await getRawTemplate(template.parent_template_id, agencyId);
  if (!parent) return template;
  // Somente dois níveis: avô -> pai -> filho.
  const grandparent = parent.parent_template_id ? await getRawTemplate(parent.parent_template_id, agencyId) : null;
  return mergeInherited(mergeInherited(grandparent, parent), template);
}

async function replaceChildren(templateId: string, input: TemplateInput) {
  const client = requireAdmin();
  for (const table of ['template_days', 'template_blocks', 'template_rules'] as const) {
    const { error } = await client.from(table).delete().eq('template_id', templateId);
    if (error) throw new Error(`Falha ao atualizar estrutura: ${error.message}`);
  }

  if (input.days?.length) {
    const { error } = await client.from('template_days').insert(input.days.map((day) => ({
      id: day.id || randomUUID(), template_id: templateId, day_number: day.day_number,
      title: day.title || '', rain_alternatives: day.rain_alternatives || '',
      meals_recommendation: day.meals_recommendation || [],
    })));
    if (error) throw new Error(`Falha ao salvar dias: ${error.message}`);
  }
  if (input.blocks?.length) {
    const { error } = await client.from('template_blocks').insert(input.blocks.map((block, index) => ({
      id: block.id || randomUUID(), template_id: templateId, day_number: block.day_number,
      item_order: block.item_order ?? index, title: block.title.trim(), description: block.description || '',
      category: block.category || 'activity', poi_id: block.poi_id || null, period: block.period || 'morning',
      duration_minutes: block.duration_minutes || null, is_required: Boolean(block.is_required),
      estimated_cost: block.estimated_cost ?? null, agency_notes: block.agency_notes || '',
      ai_instructions: block.ai_instructions || '', tags: block.tags || [], metadata: block.metadata || {},
    })));
    if (error) throw new Error(`Falha ao salvar blocos: ${error.message}`);
  }
  if (input.rules?.length) {
    const { error } = await client.from('template_rules').insert(input.rules.map((rule) => ({
      id: rule.id || randomUUID(), template_id: templateId, rule_type: rule.rule_type, params: rule.params || {},
    })));
    if (error) throw new Error(`Falha ao salvar regras: ${error.message}`);
  }
}

export async function createTemplate(input: TemplateInput, agencyId: string, userId: string) {
  const client = requireAdmin();
  if (input.name?.trim().length < 2) throw new Error('Informe um nome para o modelo.');
  if (input.parent_template_id) {
    const parent = await getRawTemplate(input.parent_template_id, agencyId);
    if (!parent) throw new Error('Modelo-base não encontrado.');
    if (parent.parent_template_id) throw new Error('A herança está limitada a dois níveis.');
  }
  const { data, error } = await client.from('itinerary_templates').insert(templateRow(input, agencyId, userId)).select('*').single();
  if (error || !data) throw new Error(`Falha ao criar modelo: ${error?.message || 'sem resposta'}`);
  try {
    await replaceChildren(data.id, input);
    await createVersion(data.id, agencyId, userId, 'Versão inicial', 'Modelo criado');
  } catch (error) {
    await client.from('itinerary_templates').delete().eq('id', data.id).eq('agency_id', agencyId);
    throw error;
  }
  return getTemplate(data.id, agencyId, false);
}

export async function updateTemplate(id: string, input: TemplateInput, agencyId: string, userId: string) {
  const client = requireAdmin();
  const current = await getRawTemplate(id, agencyId);
  if (!current) return null;
  const row = templateRow(input, agencyId, userId);
  delete (row as any).created_by;
  const { error } = await client.from('itinerary_templates').update(row).eq('id', id).eq('agency_id', agencyId);
  if (error) throw new Error(`Falha ao atualizar modelo: ${error.message}`);
  await replaceChildren(id, input);
  await createVersion(id, agencyId, userId, `v${(current.template_versions?.length || 0) + 1}`, 'Modelo atualizado');
  return getTemplate(id, agencyId, false);
}

export async function archiveTemplate(id: string, agencyId: string) {
  const client = requireAdmin();
  const { data, error } = await client.from('itinerary_templates').update({ status: 'archived', deleted_at: new Date().toISOString() }).eq('id', id).eq('agency_id', agencyId).select('id').maybeSingle();
  if (error) throw new Error(`Falha ao arquivar modelo: ${error.message}`);
  return Boolean(data);
}

export async function duplicateTemplate(id: string, agencyId: string, userId: string) {
  const source = await getTemplate(id, agencyId, true);
  if (!source) return null;
  return createTemplate({
    name: `${source.name} — cópia`, destination: source.destination, country: source.country,
    suggested_duration_days: source.suggested_duration_days, budget_range: source.budget_range,
    pace: source.pace, traveler_profile: source.traveler_profile, language: source.language,
    status: 'draft', tags: source.tags, settings: source.settings,
    days: source.template_days, blocks: source.template_blocks, rules: source.template_rules,
  }, agencyId, userId);
}

export async function createVersion(templateId: string, agencyId: string, userId: string, label: string, summary: string) {
  const client = requireAdmin();
  const template = await getRawTemplate(templateId, agencyId);
  if (!template) return null;
  const { data: last } = await client.from('template_versions').select('version_number').eq('template_id', templateId).order('version_number', { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await client.from('template_versions').insert({
    template_id: templateId, version_number: (last?.version_number || 0) + 1,
    version_label: label, changes_summary: summary, snapshot_data: template, created_by: userId,
  }).select('*').single();
  if (error) throw new Error(`Falha ao versionar modelo: ${error.message}`);
  return data;
}
