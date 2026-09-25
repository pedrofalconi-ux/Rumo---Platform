import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/server-auth';
import { searchTravelers } from '../../../../lib/server-traveler-profile-store';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    if (user.role !== 'traveler') {
      return NextResponse.json({ error: 'Area exclusiva para viajantes' }, { status: 403 });
    }

    const query = new URL(request.url).searchParams.get('q') || '';
    const results = await searchTravelers(query, user.id);
    return NextResponse.json(results);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar viajantes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
