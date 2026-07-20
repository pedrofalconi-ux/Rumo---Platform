import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '../../../../lib/server-auth';
import { getAgencySettings } from '../../../../lib/server-account-store';
import {
  AGENCY_LOGO_BUCKET,
  extractAgencyLogoPath,
  isAgencyLogoPath,
} from '../../../../lib/agency-logo';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return url && key
    ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const requestedAgencyId = new URL(request.url).searchParams.get('agencyId');
  if (requestedAgencyId && user.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const agencyId = requestedAgencyId || user.agencyId;
  const settings = await getAgencySettings(agencyId);
  const objectPath = extractAgencyLogoPath(settings.logoUrl);
  if (!objectPath || !isAgencyLogoPath(objectPath, agencyId)) {
    return NextResponse.json({ error: 'Logo não encontrada' }, { status: 404 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Armazenamento indisponível' }, { status: 503 });
  const { data, error } = await admin.storage.from(AGENCY_LOGO_BUCKET).download(objectPath);
  if (error || !data) return NextResponse.json({ error: 'Logo não encontrada' }, { status: 404 });

  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      'Content-Type': data.type || 'application/octet-stream',
      'Cache-Control': 'private, max-age=300',
      Vary: 'Cookie',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
