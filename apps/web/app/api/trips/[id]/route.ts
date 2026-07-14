import { NextResponse } from 'next/server';
import { db } from '@rumo/db';
import { getCurrentUser } from '../../../../lib/server-auth';
import { convertUrlToBase64 } from '../../../../lib/media/base64-converter';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });

    const resolvedParams = await params;
    const trip = db.trips.findOne(resolvedParams.id);
    if (!trip || trip.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Viagem nao encontrada' }, { status: 404 });
    }
    return NextResponse.json(trip);
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
    const trip = db.trips.findOne(resolvedParams.id);
    if (!trip || trip.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Viagem nao encontrada para atualizar' }, { status: 404 });
    }

    const body = await request.json();

    // Convert external URLs to Base64 to make them permanent
    if (body.coverImage && body.coverImage.startsWith('http')) {
      body.coverImage = await convertUrlToBase64(body.coverImage);
    }

    if (Array.isArray(body.itinerary)) {
      body.itinerary = await Promise.all(
        body.itinerary.map(async (item: any) => {
          if (item.image && item.image.startsWith('http')) {
            item.image = await convertUrlToBase64(item.image);
            if (item.meta) {
              item.meta.image = item.image;
            }
          }
          return item;
        })
      );
    }

    const updated = db.trips.update(resolvedParams.id, body);
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
    const trip = db.trips.findOne(resolvedParams.id);
    if (!trip || trip.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Viagem nao encontrada para deletar' }, { status: 404 });
    }

    const success = db.trips.delete(resolvedParams.id);
    return NextResponse.json({ success });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao deletar viagem';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
