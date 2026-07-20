import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { TemplateDocumentMatch } from '@rumo/ai';

const admin = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

async function embed(query: string) {
  const key = process.env.OPENAI_API_KEY || '';
  if (!key) return null;
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: query.slice(0, 6000), dimensions: 1536 }),
  });
  if (!response.ok) return null;
  const payload = await response.json() as { data?: Array<{ embedding: number[] }> };
  return payload.data?.[0]?.embedding || null;
}

export async function retrieveTemplateDocuments(templateId: string, agencyId: string, query: string, limit = 6): Promise<TemplateDocumentMatch[]> {
  if (!admin) return [];
  const embedding = await embed(query);
  if (embedding) {
    const { data, error } = await admin.rpc('match_template_document_chunks', {
      p_template_id: templateId, p_agency_id: agencyId, p_query_embedding: embedding, p_match_count: limit,
    });
    if (!error) return (data || []).map((row: any) => ({ content: row.content, similarity: Number(row.similarity), documentName: row.document_name }));
  }

  // Fallback sem custo de embedding: contexto recente do próprio modelo.
  const { data } = await admin.from('template_document_chunks')
    .select('content, template_documents!inner(name,template_id,itinerary_templates!inner(agency_id))')
    .eq('template_documents.template_id', templateId)
    .eq('template_documents.itinerary_templates.agency_id', agencyId)
    .limit(Math.min(12, limit));
  return (data || []).map((row: any) => ({ content: row.content, similarity: 0, documentName: row.template_documents?.name }));
}
