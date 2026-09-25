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
    if (user.role !== 'agency_admin') {
      return NextResponse.json({ error: 'Apenas administradores podem cadastrar colaboradores' }, { status: 403 });
    }
    const body = await request.json();
    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const role = body.role === 'agency_admin' ? 'agency_admin' : 'agent';
    const accessStatus = body.accessStatus === 'blocked' ? 'blocked' : 'active';
    const rawAccessExpiry = String(body.accessExpiresAt || '').slice(0, 10);
    const parsedAccessExpiry = rawAccessExpiry ? new Date(`${rawAccessExpiry}T23:59:59.000Z`) : null;

    if (!fullName || !email || !email.includes('@')) {
      return NextResponse.json({ error: 'Informe um nome e um e-mail validos' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'A senha inicial deve ter pelo menos 8 caracteres' }, { status: 400 });
    }
    if (body.passwordConfirm && password !== String(body.passwordConfirm)) {
      return NextResponse.json({ error: 'As senhas nao coincidem' }, { status: 400 });
    }
    if (!parsedAccessExpiry || Number.isNaN(parsedAccessExpiry.getTime())) {
      return NextResponse.json({ error: 'Informe uma data de validade valida' }, { status: 400 });
    }
    const accessExpiresAt = parsedAccessExpiry.toISOString();
    if (accessExpiresAt && new Date(accessExpiresAt) <= new Date()) {
      return NextResponse.json({ error: 'A validade do acesso deve ser uma data futura' }, { status: 400 });
    }

    const newUser = await createAgencyUser(user.agencyId, {
      fullName,
      email,
      phone: String(body.phone || '').trim(),
      role,
      password,
      accessStatus,
      accessExpiresAt,
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
    if (currentUser.role !== 'agency_admin') {
      return NextResponse.json({ error: 'Apenas administradores podem alterar acessos' }, { status: 403 });
    }

    const body = await request.json();
    const targetUser = await getUserById(body.id);
    if (!targetUser || targetUser.agencyId !== currentUser.agencyId) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
    }

    const accessStatus = body.accessStatus === 'active' ? 'active' : body.accessStatus === 'blocked' ? 'blocked' : targetUser.accessStatus;
    const role = body.role === 'agency_admin' ? 'agency_admin' : body.role === 'agent' ? 'agent' : targetUser.role;

    const updated = await updateAgencyUser(body.id, {
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      role,
      accessStatus,
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
