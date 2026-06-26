import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getCurrentUser } from '../../../../../../lib/server-auth';
import { db } from '@rumo/db';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const resolvedParams = await params;
    const tripId = resolvedParams.id;
    
    // Check if trip exists and belongs to the user's agency
    const trip = db.trips.findOne(tripId);
    if (!trip || trip.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Viagem não encontrada' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // Safety checks on size (e.g., max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'O tamanho do arquivo excede o limite de 10MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/uploads/trips/[id]/
    const uploadPath = path.join('public', 'uploads', 'trips', tripId);
    const absoluteUploadsDir = path.join(process.cwd(), uploadPath);
    await fs.mkdir(absoluteUploadsDir, { recursive: true });

    // Sanitize filename
    const cleanFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${Date.now()}-${cleanFilename}`;
    const filePath = path.join(absoluteUploadsDir, filename);
    await fs.writeFile(filePath, buffer);

    // Return the document metadata
    const docUrl = `/uploads/trips/${tripId}/${filename}`;
    const documentMeta = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      url: docUrl,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };

    return NextResponse.json(documentMeta);
  } catch (error) {
    console.error('Erro no upload de documento:', error);
    return NextResponse.json({ error: 'Erro ao processar o arquivo de documento' }, { status: 500 });
  }
}
