import { NextResponse } from 'next/server';
import { agencyLogoProxyUrl, extractAgencyLogoPath } from '../../../lib/agency-logo';
import { getAgencySettings } from '../../../lib/server-account-store';
import { getCurrentUser } from '../../../lib/server-auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });

    if (user.role === 'platform_admin') {
      return NextResponse.json({
        user,
        settings: { agencyName: 'Rumo Admin', logoUrl: '' },
      });
    }

    const settings = await getAgencySettings(user.agencyId);
    return NextResponse.json({
      user,
      settings: {
        agencyName: String(settings.agencyName || 'Rumo'),
        logoUrl: extractAgencyLogoPath(settings.logoUrl)
          ? agencyLogoProxyUrl()
          : String(settings.logoUrl || ''),
      },
    });
  } catch (error) {
    console.error('Erro ao carregar o shell da plataforma:', error);
    return NextResponse.json({ error: 'Erro ao carregar a plataforma' }, { status: 500 });
  }
}
