import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../lib/server-auth';
import { archiveTemplate, duplicateTemplate, getTemplate, updateTemplate } from '../../../../../lib/templates-store';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const { id } = await params;
    const template = await getTemplate(id, user.agencyId, true);
    return template ? NextResponse.json(template) : NextResponse.json({ error: 'Modelo não encontrado' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao carregar modelo' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();
    const template = body.action === 'duplicate'
      ? await duplicateTemplate(id, user.agencyId, user.id)
      : await updateTemplate(id, body, user.agencyId, user.id);
    return template ? NextResponse.json(template) : NextResponse.json({ error: 'Modelo não encontrado' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao atualizar modelo' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const { id } = await params;
    const archived = await archiveTemplate(id, user.agencyId);
    return archived ? NextResponse.json({ success: true }) : NextResponse.json({ error: 'Modelo não encontrado' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao arquivar modelo' }, { status: 500 });
  }
}
