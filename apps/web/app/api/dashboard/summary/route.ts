import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/server-auth';
import { getDashboardSummary } from '../../../../lib/server-dashboard-data';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });

    const summary = await getDashboardSummary(user.agencyId);

    return NextResponse.json(summary,
      {
        headers: {
          'Cache-Control': 'private, max-age=15, stale-while-revalidate=45',
        },
      }
    );
  } catch (error) {
    console.error('Erro ao montar resumo do dashboard:', error);
    return NextResponse.json({ error: 'Erro ao carregar o resumo da operacao' }, { status: 500 });
  }
}
