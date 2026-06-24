import { NextResponse } from 'next/server';
import { db } from '@rumo/db';
import { getCurrentUser } from '../../../lib/server-auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    const users = db.users.findMany(user.agencyId);
    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar usuarios' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    const body = await request.json();
    const newUser = db.users.create({
      ...body,
      agencyId: user.agencyId,
      password: body.password || 'rumo123',
    });
    return NextResponse.json(newUser);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao criar usuario';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });

    const body = await request.json();
    const targetUser = db.users.findOne(body.id);
    if (!targetUser || targetUser.agencyId !== currentUser.agencyId) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
    }

    const updated = db.users.update(body.id, {
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      role: body.role,
      accessStatus: body.accessStatus,
      accessExpiresAt: body.accessExpiresAt,
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar usuario';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
