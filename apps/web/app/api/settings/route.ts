import { NextResponse } from 'next/server';
import { db } from '@rumo/db';
import { getCurrentUser } from '../../../lib/server-auth';

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
    return NextResponse.json(sanitizeAgencySettings(db.settings.get(user.agencyId)));
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar configuracoes' }, { status: 500 });
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
    return NextResponse.json(sanitizeAgencySettings(db.settings.update({ ...pickAgencyEditableSettings(body), agencyId: user.agencyId })));
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar configuracoes' }, { status: 500 });
  }
}
