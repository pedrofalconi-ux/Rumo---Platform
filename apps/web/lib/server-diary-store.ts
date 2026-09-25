import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const DIARY_MEDIA_BUCKET = 'diary-media';
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function ensureBucket(admin: NonNullable<ReturnType<typeof getAdmin>>) {
  const { data, error: readError } = await admin.storage.getBucket(DIARY_MEDIA_BUCKET);
  if (readError && !/not found/i.test(readError.message)) throw readError;
  if (data) return;

  const { error } = await admin.storage.createBucket(DIARY_MEDIA_BUCKET, {
    public: true,
    fileSizeLimit: MAX_IMAGE_SIZE,
    allowedMimeTypes: Object.keys(ALLOWED_TYPES),
  });
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
}

async function uploadDiaryPhoto(userId: string, file: File) {
  const contentType = file.type.toLowerCase();
  if (!ALLOWED_TYPES[contentType]) throw new Error('Use uma imagem JPG, PNG, WEBP ou HEIC.');
  if (file.size > MAX_IMAGE_SIZE) throw new Error('A imagem deve ter no máximo 10 MB.');

  const admin = getAdmin();
  if (!admin) throw new Error('Armazenamento de mídia não configurado.');
  await ensureBucket(admin);

  const bytes = Buffer.from(await file.arrayBuffer());
  const path = `${userId}/${randomUUID()}.${ALLOWED_TYPES[contentType]}`;
  const { error } = await admin.storage.from(DIARY_MEDIA_BUCKET).upload(path, bytes, {
    contentType,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw error;

  const { data } = admin.storage.from(DIARY_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export interface DiaryEntryRow {
  id: string;
  userId: string;
  tripId: string;
  day: number;
  title: string;
  body: string;
  photoUrl: string | null;
  createdAt: string;
}

interface DiaryEntryDbRow {
  id: string;
  user_id: string;
  trip_id: string;
  day: number;
  title: string;
  body: string;
  photo_url: string | null;
  created_at: string;
}

function mapRow(row: DiaryEntryDbRow): DiaryEntryRow {
  return {
    id: row.id,
    userId: row.user_id,
    tripId: row.trip_id,
    day: row.day,
    title: row.title,
    body: row.body,
    photoUrl: row.photo_url,
    createdAt: row.created_at,
  };
}

export async function listDiaryEntries(userId: string, tripId: string): Promise<DiaryEntryRow[]> {
  const admin = getAdmin();
  if (!admin) throw new Error('Banco de dados não configurado.');
  const { data, error } = await admin
    .from('diary_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('trip_id', tripId)
    .order('day', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapRow);
}

export async function createDiaryEntry(input: {
  userId: string;
  tripId: string;
  day: number;
  title: string;
  body: string;
  photoFile?: File | null;
}): Promise<DiaryEntryRow> {
  const admin = getAdmin();
  if (!admin) throw new Error('Banco de dados não configurado.');

  const photoUrl = input.photoFile && input.photoFile.size > 0
    ? await uploadDiaryPhoto(input.userId, input.photoFile)
    : null;

  const { data, error } = await admin
    .from('diary_entries')
    .insert({
      user_id: input.userId,
      trip_id: input.tripId,
      day: input.day,
      title: input.title,
      body: input.body,
      photo_url: photoUrl,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function deleteDiaryEntry(userId: string, entryId: string): Promise<void> {
  const admin = getAdmin();
  if (!admin) throw new Error('Banco de dados não configurado.');
  const { error } = await admin.from('diary_entries').delete().eq('id', entryId).eq('user_id', userId);
  if (error) throw error;
}
