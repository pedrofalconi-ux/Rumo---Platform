import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getCurrentUser } from '../../../../lib/server-auth';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File;
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'O arquivo enviado não é uma imagem válida' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/uploads
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate unique clean name
    const ext = path.extname(file.name) || '.png';
    const filename = `logo-${user.agencyId || 'agency'}-${Date.now()}${ext}`;
    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, buffer);

    // Return the public URL
    const logoUrl = `/uploads/${filename}`;
    return NextResponse.json({ logoUrl });
  } catch (error) {
    console.error('Erro no upload de logo:', error);
    return NextResponse.json({ error: 'Erro ao processar o arquivo de logo' }, { status: 500 });
  }
}
