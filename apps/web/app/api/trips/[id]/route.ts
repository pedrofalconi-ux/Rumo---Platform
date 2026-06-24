import { NextResponse } from 'next/server';
import { db } from '@rumo/db';
import { getCurrentUser } from '../../../../lib/server-auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });

    const resolvedParams = await params;
    const trip = db.trips.findOne(resolvedParams.id);
    if (!trip || trip.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Viagem nao encontrada' }, { status: 404 });
    }
    return NextResponse.json(trip);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar viagem' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });

    const resolvedParams = await params;
    const trip = db.trips.findOne(resolvedParams.id);
    if (!trip || trip.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Viagem nao encontrada para atualizar' }, { status: 404 });
    }

    const body = await request.json();
    const updated = db.trips.update(resolvedParams.id, body);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Erro ao salvar alteracoes da viagem' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });

    const resolvedParams = await params;
    const trip = db.trips.findOne(resolvedParams.id);
    if (!trip || trip.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Viagem nao encontrada para deletar' }, { status: 404 });
    }

    const success = db.trips.delete(resolvedParams.id);
    return NextResponse.json({ success });
  } catch {
    return NextResponse.json({ error: 'Erro ao deletar viagem' }, { status: 500 });
  }
}
