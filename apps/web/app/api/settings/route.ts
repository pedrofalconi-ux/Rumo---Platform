import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/server-auth';
import { getAgencySettings, updateAgencySettings } from '../../../lib/server-account-store';

const agencyEditableFields = [
  'agencyName',
  'logoUrl',
  'defaultCurrency',
  'amadeusKey',
  'tboKey',
  'claudeKey',
  'pixabayKey',
  'notificationEmail',
] as const;

function sanitizeAgencySettings(settings: any) {
  const sanitized: Record<string, unknown> = {};
  for (const field of agencyEditableFields) {
    sanitized[field] = settings[field] ?? '';
  }
  sanitized.defaultCurrency = settings.defaultCurrency || 'BRL';
  return sanitized;
}

function pickAgencyEditableSettings(body: any) {
  const picked: Record<string, unknown> = {};
  for (const field of agencyEditableFields) {
    if (typeof body[field] !== 'undefined') {
      picked[field] = body[field];
    }
  }
  return picked;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    if (user.role === 'platform_admin') {
      return NextResponse.json({ agencyName: 'Rumo Admin', logoUrl: '', defaultCurrency: 'BRL', notificationEmail: '' });
    }
    return NextResponse.json(sanitizeAgencySettings(await getAgencySettings(user.agencyId)));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar configuracoes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    if (user.role === 'platform_admin') {
      return NextResponse.json({ error: 'Use o painel Admin SaaS para configuracoes sensiveis' }, { status: 403 });
    }
    const body = await request.json();
    return NextResponse.json(
      sanitizeAgencySettings(await updateAgencySettings(user.agencyId, pickAgencyEditableSettings(body)))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao salvar configuracoes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
