import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/server-auth';
import {
  createAgencyUser,
  deleteAgencyUser,
  getUserById,
  listUsersForAgency,
  updateAgencyUser,
} from '../../../lib/server-account-store';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    const users = await listUsersForAgency(user.agencyId);
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
    const newUser = await createAgencyUser(user.agencyId, {
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      role: body.role,
      password: body.password || 'rumo123',
      accessStatus: body.accessStatus,
      accessExpiresAt: body.accessExpiresAt,
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
    const targetUser = await getUserById(body.id);
    if (!targetUser || targetUser.agencyId !== currentUser.agencyId) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
    }

    const updated = await updateAgencyUser(body.id, {
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

export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    if (currentUser.role !== 'agency_admin') {
      return NextResponse.json({ error: 'Apenas administradores podem remover usuarios' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID do usuario nao informado' }, { status: 400 });

    const targetUser = await getUserById(id);
    if (!targetUser || targetUser.agencyId !== currentUser.agencyId) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
    }

    if (targetUser.id === currentUser.id) {
      return NextResponse.json({ error: 'Voce nao pode remover seu proprio usuario' }, { status: 400 });
    }

    await deleteAgencyUser(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao remover usuario';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
