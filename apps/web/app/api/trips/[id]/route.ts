import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/server-auth';
import { persistTripMedia } from '../../../../lib/media/persist-trip-media';
import { deleteTripForAgency, findTripById, updateTripForAgency } from '../../../../lib/server-trip-store';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });

    const resolvedParams = await params;
    const trip = await findTripById(resolvedParams.id, user.agencyId);
    if (!trip) {
      return NextResponse.json({ error: 'Viagem nao encontrada' }, { status: 404 });
    }
    return NextResponse.json(trip, {
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar viagem';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });

    const resolvedParams = await params;
    const trip = await findTripById(resolvedParams.id, user.agencyId);
    if (!trip) {
      return NextResponse.json({ error: 'Viagem nao encontrada para atualizar' }, { status: 404 });
    }

    const body = await persistTripMedia(await request.json(), user.agencyId);

    const updated = await updateTripForAgency(resolvedParams.id, body, user.agencyId, user.id);
    if (!updated) {
      return NextResponse.json({ error: 'Viagem nao encontrada para atualizar' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erro ao salvar alteracoes da viagem:', error);
    const message = error instanceof Error ? error.message : 'Erro ao salvar alteracoes da viagem';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });

    const resolvedParams = await params;
    const trip = await findTripById(resolvedParams.id, user.agencyId);
    if (!trip) {
      return NextResponse.json({ error: 'Viagem nao encontrada para deletar' }, { status: 404 });
    }

    const success = await deleteTripForAgency(resolvedParams.id, user.agencyId);
    return NextResponse.json({ success });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao deletar viagem';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
