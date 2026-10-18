import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/server-auth';
import { getAgencySettings, updateAgencySettings } from '../../../lib/server-account-store';
import { agencyLogoProxyUrl, extractAgencyLogoPath } from '../../../lib/agency-logo';

const agencyEditableFields = [
  'agencyName',
  'logoUrl',
  'defaultCurrency',
  'notificationEmail',
  'appThemeId',
] as const;

type AgencySettingsView = Partial<Record<(typeof agencyEditableFields)[number], unknown>>;

function sanitizeAgencySettings(settings: AgencySettingsView) {
  const sanitized: Record<string, unknown> = {};
  for (const field of agencyEditableFields) {
    sanitized[field] = settings[field] ?? '';
  }
  sanitized.defaultCurrency = settings.defaultCurrency || 'BRL';
  sanitized.logoUrl = extractAgencyLogoPath(String(settings.logoUrl || ''))
    ? agencyLogoProxyUrl()
    : settings.logoUrl || '';
  return sanitized;
}

function pickAgencyEditableSettings(body: Record<string, unknown>) {
  const picked: Record<string, unknown> = {};
  for (const field of agencyEditableFields) {
    if (field === 'logoUrl' && String(body[field] || '').startsWith('/api/settings/logo')) {
      continue;
    }
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
      return NextResponse.json({
        agencyName: 'Rumo Admin',
        logoUrl: '',
        defaultCurrency: 'BRL',
        notificationEmail: '',
        appThemeId: 'rumo',
      });
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
