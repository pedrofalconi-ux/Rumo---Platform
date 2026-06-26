import { NextResponse } from 'next/server';
import { db } from '@rumo/db';
import { getCurrentUser } from '../../../../lib/server-auth';

function ensurePlatformAdmin(user: any) {
  return user?.role === 'platform_admin';
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    if (!ensurePlatformAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito ao admin da plataforma' }, { status: 403 });
    }

    const agencies = db.agencies.findMany();
    const users = db.users.findMany();
    const trips = db.trips.findMany();

    return NextResponse.json(
      agencies.map((agency: any) => ({
        ...agency,
        usersCount: users.filter((agencyUser: any) => agencyUser.agencyId === agency.id).length,
        users: users
          .filter((agencyUser: any) => agencyUser.agencyId === agency.id)
          .map((agencyUser: any) => ({
            id: agencyUser.id,
            fullName: agencyUser.fullName,
            email: agencyUser.email,
            role: agencyUser.role,
            accessStatus: agencyUser.accessStatus,
            accessExpiresAt: agencyUser.accessExpiresAt,
          })),
        tripsCount: trips.filter((trip: any) => trip.agencyId === agency.id).length,
      }))
    );
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar agencias' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    if (!ensurePlatformAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito ao admin da plataforma' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'ID da agencia obrigatorio' }, { status: 400 });
    }

    const updated = db.agencies.update(body.id, {
      name: body.name,
      plan: body.plan,
      subscriptionStatus: body.subscriptionStatus,
      accessExpiresAt: body.accessExpiresAt,
      logoUrl: body.logoUrl,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Agencia nao encontrada' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar agencia' }, { status: 500 });
  }
}
