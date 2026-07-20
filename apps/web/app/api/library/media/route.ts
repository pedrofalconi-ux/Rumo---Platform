import { randomUUID } from 'crypto';
import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/server-auth';
import { createPhotoForAgency } from '../../../../lib/server-library-store';

const BUCKET = 'library-media';
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function ensureBucket(admin: NonNullable<ReturnType<typeof getAdmin>>) {
  const { data } = await admin.storage.getBucket(BUCKET);
  if (data) return;
  const { error } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_IMAGE_SIZE,
    allowedMimeTypes: Object.keys(ALLOWED_TYPES),
  });
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
}

function isPrivateAddress(address: string) {
  return (
    /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address) ||
    address === '::1' ||
    address.startsWith('fc') ||
    address.startsWith('fd') ||
    address.startsWith('fe80:')
  );
}

async function assertSafeRemoteUrl(rawUrl: string) {
  const parsed = new URL(rawUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('URL de imagem inválida.');
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.local') || (isIP(hostname) > 0 && isPrivateAddress(hostname))) {
    throw new Error('Endereço de imagem não permitido.');
  }
  const addresses = await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('Endereço de imagem não permitido.');
  }
  return parsed;
}

async function readRemoteImage(rawUrl: string) {
  let url = await assertSafeRemoteUrl(rawUrl);
  let response: Response | null = null;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(12_000),
      headers: { 'User-Agent': 'Rumo-Media-Persistence/1.0' },
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get('location');
    if (!location || redirects === 3) throw new Error('A imagem possui redirecionamentos inválidos.');
    url = await assertSafeRemoteUrl(new URL(location, url).toString());
  }
  if (!response) throw new Error('Não foi possível baixar a imagem selecionada.');
  if (!response.ok) throw new Error('Não foi possível baixar a imagem selecionada.');
  const contentType = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
  if (!ALLOWED_TYPES[contentType]) throw new Error('O endereço selecionado não retornou uma imagem compatível.');
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > MAX_IMAGE_SIZE) throw new Error('A imagem deve ter no máximo 10 MB.');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_IMAGE_SIZE) throw new Error('A imagem deve ter no máximo 10 MB.');
  return { bytes, contentType };
}

export async function POST(request: Request) {
  let uploadedPath = '';
  try {
    const user = await getCurrentUser(request);
    if (!user?.agencyId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const form = await request.formData();
    const file = form.get('file');
    const sourceUrl = String(form.get('sourceUrl') || '').trim();
    const name = String(form.get('name') || '').trim() || 'Foto';
    const folder = String(form.get('folder') || '');
    let bytes: Buffer;
    let contentType: string;

    if (file instanceof File && file.size > 0) {
      contentType = file.type.toLowerCase();
      if (!ALLOWED_TYPES[contentType]) throw new Error('Use uma imagem JPG, PNG, WEBP, AVIF ou GIF.');
      if (file.size > MAX_IMAGE_SIZE) throw new Error('A imagem deve ter no máximo 10 MB.');
      bytes = Buffer.from(await file.arrayBuffer());
    } else if (sourceUrl) {
      ({ bytes, contentType } = await readRemoteImage(sourceUrl));
    } else {
      return NextResponse.json({ error: 'Selecione uma imagem.' }, { status: 400 });
    }

    const admin = getAdmin();
    if (!admin) return NextResponse.json({ error: 'Armazenamento de mídia não configurado.' }, { status: 503 });
    await ensureBucket(admin);

    uploadedPath = `${user.agencyId}/${new Date().getUTCFullYear()}/${randomUUID()}.${ALLOWED_TYPES[contentType]}`;
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(uploadedPath, bytes, {
      contentType,
      cacheControl: '31536000',
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data } = admin.storage.from(BUCKET).getPublicUrl(uploadedPath);
    const photo = await createPhotoForAgency(user.agencyId, { folder, name, url: data.publicUrl });
    return NextResponse.json(photo);
  } catch (error) {
    if (uploadedPath) {
      const admin = getAdmin();
      await admin?.storage.from(BUCKET).remove([uploadedPath]);
    }
    const message = error instanceof Error ? error.message : 'Não foi possível armazenar a imagem.';
    console.error('[library/media]', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
