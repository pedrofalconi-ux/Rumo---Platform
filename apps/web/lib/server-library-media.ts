import { randomUUID } from 'crypto';
import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { createClient } from '@supabase/supabase-js';

export const LIBRARY_MEDIA_BUCKET = 'library-media';
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
  const { data, error: readError } = await admin.storage.getBucket(LIBRARY_MEDIA_BUCKET);
  if (readError && !/not found/i.test(readError.message)) throw readError;

  if (data) {
    if (!data.public) {
      const { error } = await admin.storage.updateBucket(LIBRARY_MEDIA_BUCKET, {
        public: true,
        fileSizeLimit: MAX_IMAGE_SIZE,
        allowedMimeTypes: Object.keys(ALLOWED_TYPES),
      });
      if (error) throw error;
    }
    return;
  }

  const { error } = await admin.storage.createBucket(LIBRARY_MEDIA_BUCKET, {
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

function readDataImage(rawUrl: string) {
  const match = rawUrl.match(/^data:(image\/(?:jpeg|png|webp|avif|gif));base64,([a-z0-9+/=\s]+)$/i);
  if (!match) return null;
  const contentType = match[1].toLowerCase();
  const bytes = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!bytes.length || bytes.length > MAX_IMAGE_SIZE) throw new Error('A imagem deve ter no máximo 10 MB.');
  return { bytes, contentType };
}

async function readRemoteImage(rawUrl: string) {
  const dataImage = readDataImage(rawUrl);
  if (dataImage) return dataImage;

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
  if (!response?.ok) throw new Error('Não foi possível baixar a imagem selecionada.');
  const contentType = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
  if (!ALLOWED_TYPES[contentType]) throw new Error('O endereço selecionado não retornou uma imagem compatível.');
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > MAX_IMAGE_SIZE) throw new Error('A imagem deve ter no máximo 10 MB.');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_IMAGE_SIZE) throw new Error('A imagem deve ter no máximo 10 MB.');
  return { bytes, contentType };
}

export function libraryMediaStoragePath(url: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!supabaseUrl || !url) return null;
  const prefix = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${LIBRARY_MEDIA_BUCKET}/`;
  return url.startsWith(prefix) ? decodeURIComponent(url.slice(prefix.length)) : null;
}

export async function persistLibraryMedia(input: {
  agencyId: string;
  file?: File | null;
  sourceUrl?: string;
}) {
  let bytes: Buffer;
  let contentType: string;

  if (input.file && input.file.size > 0) {
    contentType = input.file.type.toLowerCase();
    if (!ALLOWED_TYPES[contentType]) throw new Error('Use uma imagem JPG, PNG, WEBP, AVIF ou GIF.');
    if (input.file.size > MAX_IMAGE_SIZE) throw new Error('A imagem deve ter no máximo 10 MB.');
    bytes = Buffer.from(await input.file.arrayBuffer());
  } else if (input.sourceUrl) {
    ({ bytes, contentType } = await readRemoteImage(input.sourceUrl));
  } else {
    throw new Error('Selecione uma imagem.');
  }

  const admin = getAdmin();
  if (!admin) throw new Error('Armazenamento de mídia não configurado.');
  await ensureBucket(admin);

  const path = `${input.agencyId}/${new Date().getUTCFullYear()}/${randomUUID()}.${ALLOWED_TYPES[contentType]}`;
  const { error } = await admin.storage.from(LIBRARY_MEDIA_BUCKET).upload(path, bytes, {
    contentType,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw error;

  const { data } = admin.storage.from(LIBRARY_MEDIA_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function removeLibraryMedia(urlOrPath: string) {
  const admin = getAdmin();
  if (!admin) return;
  const path = libraryMediaStoragePath(urlOrPath) || urlOrPath;
  if (path) await admin.storage.from(LIBRARY_MEDIA_BUCKET).remove([path]);
}
