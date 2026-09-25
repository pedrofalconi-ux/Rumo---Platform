import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/server-auth';
import { getOwnProfile } from '../../../../lib/server-traveler-profile-store';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    if (user.role !== 'traveler') {
      return NextResponse.json({ error: 'Area exclusiva para viajantes' }, { status: 403 });
    }

    const profile = await getOwnProfile(user.id);
    return NextResponse.json(profile);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar o perfil';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
