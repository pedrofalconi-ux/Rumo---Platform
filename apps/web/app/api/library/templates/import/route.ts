import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '../../../../../lib/server-auth';
import { getTemplate } from '../../../../../lib/templates-store';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

function safeFileName(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 120);
}

async function extractText(file: File, buffer: Buffer) {
  if (file.type === 'text/plain') return buffer.toString('utf8');
  if (file.type === 'application/pdf') {
    const pdfParse = (await import('pdf-parse')).default;
    return (await pdfParse(buffer)).text;
  }
  if (file.type.includes('wordprocessingml')) {
    const mammoth = await import('mammoth');
    return (await mammoth.extractRawText({ buffer })).value;
  }
  if (file.type.includes('spreadsheetml')) {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const rows: string[] = [];
    workbook.eachSheet((sheet) => sheet.eachRow((row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : Object.values(row.values || {});
      rows.push(values.map((value) => String(value ?? '')).join(' | '));
    }));
    return rows.join('\n');
  }
  throw new Error('Formato de arquivo não suportado.');
}

function chunkText(text: string, size = 1000, overlap = 150) {
  const normalized = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  const chunks: string[] = [];
  for (let start = 0; start < normalized.length && chunks.length < 200; start += size - overlap) {
    let end = Math.min(normalized.length, start + size);
    if (end < normalized.length) {
      const boundary = normalized.lastIndexOf('\n', end);
      if (boundary > start + size / 2) end = boundary;
    }
    chunks.push(normalized.slice(start, end).trim());
    if (end >= normalized.length) break;
    start = end - (size - overlap);
  }
  return chunks.filter(Boolean);
}

function parseOutline(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let day = 1;
  const days = new Map<number, { day_number: number; title: string }>();
  const blocks: Array<Record<string, unknown>> = [];
  for (const line of lines) {
    const dayMatch = line.match(/^(?:dia|day)\s*(\d{1,3})\s*[:—-]?\s*(.*)$/i);
    if (dayMatch) {
      day = Number(dayMatch[1]);
      days.set(day, { day_number: day, title: dayMatch[2] || `Dia ${day}` });
      continue;
    }
    if (line.length < 4 || line.length > 300) continue;
    if (/^[-•*\d.)]+\s*/.test(line) || /^(manhã|manha|morning|tarde|afternoon|noite|night)\b/i.test(line)) {
      const clean = line.replace(/^[-•*\d.)]+\s*/, '');
      const period = /^(manhã|manha|morning)/i.test(clean) ? 'morning' : /^(tarde|afternoon)/i.test(clean) ? 'afternoon' : /^(noite|night)/i.test(clean) ? 'night' : 'any';
      const title = clean.replace(/^(manhã|manha|morning|tarde|afternoon|noite|night)\s*[:—-]?\s*/i, '').slice(0, 200);
      blocks.push({ day_number: day, item_order: blocks.filter((block) => block.day_number === day).length, title, description: '', category: /restaurante|restaurant|almoço|almoco|jantar/i.test(title) ? 'restaurant' : 'activity', period, is_required: false, tags: [] });
      days.set(day, days.get(day) || { day_number: day, title: `Dia ${day}` });
    }
  }
  return { days: Array.from(days.values()).sort((a, b) => a.day_number - b.day_number), blocks };
}

async function createEmbeddings(chunks: string[]) {
  const key = process.env.OPENAI_API_KEY || '';
  if (!key || !chunks.length) return null;
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: chunks, dimensions: 1536 }),
  });
  if (!response.ok) throw new Error(`Falha ao gerar embeddings (${response.status}).`);
  const body = await response.json() as { data?: Array<{ embedding: number[]; index: number }> };
  return (body.data || []).sort((a, b) => a.index - b.index).map((item) => item.embedding);
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const form = await request.formData();
    const file = form.get('file');
    const templateId = String(form.get('templateId') || '');
    if (!(file instanceof File) || !templateId) return NextResponse.json({ error: 'Arquivo e templateId são obrigatórios.' }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Arquivo inválido ou maior que 15 MB.' }, { status: 400 });
    if (!(await getTemplate(templateId, user.agencyId, false))) return NextResponse.json({ error: 'Modelo não encontrado.' }, { status: 404 });

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '', { auth: { persistSession: false } });
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractText(file, buffer);
    if (text.trim().length < 20) return NextResponse.json({ error: 'Não foi possível extrair texto suficiente do documento.' }, { status: 422 });
    const storagePath = `${user.agencyId}/${templateId}/${randomUUID()}-${safeFileName(file.name)}`;
    const upload = await admin.storage.from('template-documents').upload(storagePath, buffer, { contentType: file.type, upsert: false });
    if (upload.error) throw new Error(`Falha no upload: ${upload.error.message}`);

    const { data: document, error: documentError } = await admin.from('template_documents').insert({
      template_id: templateId, name: file.name, file_url: storagePath, mime_type: file.type, embedding_status: 'processing',
    }).select('*').single();
    if (documentError || !document) throw new Error(`Falha ao registrar documento: ${documentError?.message || 'sem resposta'}`);

    const chunks = chunkText(text);
    let embeddings: number[][] | null = null;
    let embeddingError = '';
    try { embeddings = await createEmbeddings(chunks); } catch (error) { embeddingError = error instanceof Error ? error.message : String(error); }
    const chunkRows = chunks.map((content, index) => ({
      document_id: document.id, chunk_index: index, content,
      token_count: Math.ceil(content.length / 4), metadata: { source: file.name },
      embedding: embeddings?.[index] || null,
    }));
    const { error: chunksError } = await admin.from('template_document_chunks').insert(chunkRows);
    if (chunksError) throw new Error(`Falha ao salvar trechos: ${chunksError.message}`);
    await admin.from('template_documents').update({
      chunk_count: chunks.length,
      embedding_status: embeddings ? 'ready' : 'pending',
      error_message: embeddingError || (embeddings ? null : 'OPENAI_API_KEY ausente; texto salvo para indexação posterior.'),
    }).eq('id', document.id);

    const outline = parseOutline(text);
    return NextResponse.json({
      documentId: document.id, fileName: file.name, chunkCount: chunks.length,
      embeddingStatus: embeddings ? 'ready' : 'pending',
      extractedCharacters: text.length, days: outline.days, blocks: outline.blocks,
      activitiesCount: outline.blocks.filter((block) => block.category !== 'restaurant').length,
      restaurantsCount: outline.blocks.filter((block) => block.category === 'restaurant').length,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao importar documento' }, { status: 500 });
  }
}
