import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/server-auth';
import { createPhotoForAgency } from '../../../../lib/server-library-store';
import { persistLibraryMedia, removeLibraryMedia } from '../../../../lib/server-library-media';

export async function POST(request: Request) {
  let uploadedUrl = '';
  try {
    const user = await getCurrentUser(request);
    if (!user?.agencyId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const form = await request.formData();
    const file = form.get('file');
    const sourceUrl = String(form.get('sourceUrl') || '').trim();
    const name = String(form.get('name') || '').trim() || 'Foto';
    const folder = String(form.get('folder') || '');

    const stored = await persistLibraryMedia({
      agencyId: user.agencyId,
      file: file instanceof File ? file : null,
      sourceUrl,
    });
    uploadedUrl = stored.publicUrl;

    const photo = await createPhotoForAgency(user.agencyId, { folder, name, url: stored.publicUrl });
    return NextResponse.json(photo);
  } catch (error) {
    if (uploadedUrl) await removeLibraryMedia(uploadedUrl);
    const message = error instanceof Error ? error.message : 'Não foi possível armazenar a imagem.';
    console.error('[library/media]', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
