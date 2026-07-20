import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '../../../../lib/server-auth';
import { updateAgencySettings } from '../../../../lib/server-account-store';
import {
  AGENCY_LOGO_BUCKET,
  agencyLogoProxyUrl,
  agencyLogoReference,
  safeAgencyStorageId,
} from '../../../../lib/agency-logo';

const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function ensureLogoBucket(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const { data, error } = await admin.storage.getBucket(AGENCY_LOGO_BUCKET);
  if (data && !error) {
    if (data.public) {
      const { error: updateError } = await admin.storage.updateBucket(AGENCY_LOGO_BUCKET, {
        public: false,
        fileSizeLimit: MAX_LOGO_SIZE,
        allowedMimeTypes: Object.keys(ALLOWED_TYPES),
      });
      if (updateError) throw updateError;
    }
    return;
  }

  const { error: createError } = await admin.storage.createBucket(AGENCY_LOGO_BUCKET, {
    public: false,
    fileSizeLimit: MAX_LOGO_SIZE,
    allowedMimeTypes: Object.keys(ALLOWED_TYPES),
  });
  if (createError && !/already exists|duplicate/i.test(createError.message)) throw createError;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const formData = await request.formData();
    const logo = formData.get('logo');
    if (!(logo instanceof File)) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const extension = ALLOWED_TYPES[logo.type];
    if (!extension) {
      return NextResponse.json({ error: 'Use uma imagem PNG, JPG, WEBP ou AVIF.' }, { status: 400 });
    }
    if (logo.size <= 0 || logo.size > MAX_LOGO_SIZE) {
      return NextResponse.json({ error: 'A imagem deve ter no máximo 2 MB.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Armazenamento de imagens não configurado.' }, { status: 503 });
    }

    await ensureLogoBucket(admin);
    const safeAgencyId = safeAgencyStorageId(user.agencyId);
    const objectPath = `${safeAgencyId}/logos/logo-${Date.now()}.${extension}`;
    const bytes = Buffer.from(await logo.arrayBuffer());
    const { error: uploadError } = await admin.storage.from(AGENCY_LOGO_BUCKET).upload(objectPath, bytes, {
      contentType: logo.type,
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadError) throw uploadError;

    await updateAgencySettings(user.agencyId, { logoUrl: agencyLogoReference(objectPath) });
    return NextResponse.json({ logoUrl: `${agencyLogoProxyUrl()}?v=${Date.now()}` });
  } catch (error) {
    console.error('[settings/logo-upload]', error);
    return NextResponse.json({ error: 'Não foi possível armazenar a logo. Tente novamente.' }, { status: 500 });
  }
}
