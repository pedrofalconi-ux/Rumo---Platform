import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/server-auth';
import {
  createFolderForAgency,
  createPhotoForAgency,
  deleteFolderForAgency,
  deletePhotoForAgency,
  getLibraryState,
  moveFolderForAgency,
  movePhotoForAgency,
  renameFolderForAgency,
  renamePhotoForAgency,
  setFolderCoverForAgency,
  updateOrderForAgency,
} from '../../../lib/server-library-store';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.agencyId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const state = await getLibraryState(user.agencyId);
    return NextResponse.json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar biblioteca';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.agencyId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { action, name, folder, url, draggedPath, targetPath, position } = body;

    if (action === 'create_folder') {
      const folderName = String(name || '').trim();
      if (!folderName) {
        return NextResponse.json({ error: 'Nome da pasta obrigatorio' }, { status: 400 });
      }

      const state = await getLibraryState(user.agencyId);
      if (state.folders.includes(folderName)) {
        return NextResponse.json({ error: 'Ja existe uma pasta com esse nome neste local' }, { status: 409 });
      }

      const result = await createFolderForAgency(user.agencyId, folderName);
      return NextResponse.json({ success: true, folder: result.folder });
    }

    if (action === 'move_folder') {
      if (!draggedPath || !targetPath || !position) {
        return NextResponse.json({ error: 'Parâmetros insuficientes' }, { status: 400 });
      }

      if (targetPath === draggedPath || String(targetPath).startsWith(`${draggedPath}/`)) {
        return NextResponse.json(
          { error: 'Movimento inválido: não é possível mover uma pasta para dentro de si mesma' },
          { status: 400 }
        );
      }

      const state = await moveFolderForAgency(user.agencyId, String(draggedPath), String(targetPath), position);
      return NextResponse.json({ success: true, ...state });
    }

    if (action === 'update_order') {
      const { parentPath, itemIds } = body;
      if (parentPath === undefined || !itemIds) {
        return NextResponse.json({ error: 'Parâmetros insuficientes' }, { status: 400 });
      }

      const state = await updateOrderForAgency(user.agencyId, String(parentPath), itemIds);
      return NextResponse.json({ success: true, orders: state.orders });
    }

    if (action === 'move_photo') {
      const { photoId, targetFolder } = body;
      if (!photoId || targetFolder === undefined) {
        return NextResponse.json({ error: 'Parâmetros insuficientes' }, { status: 400 });
      }

      const state = await movePhotoForAgency(user.agencyId, String(photoId), String(targetFolder));
      return NextResponse.json({ success: true, photos: state.photos });
    }

    if (action === 'delete_photo') {
      const { photoId } = body;
      if (!photoId) {
        return NextResponse.json({ error: 'Parâmetro insuficiente' }, { status: 400 });
      }

      const state = await deletePhotoForAgency(user.agencyId, String(photoId));
      return NextResponse.json({ success: true, photos: state.photos });
    }

    if (action === 'delete_folder') {
      const { folderPath } = body;
      if (!folderPath) {
        return NextResponse.json({ error: 'Parâmetro insuficiente' }, { status: 400 });
      }

      const state = await deleteFolderForAgency(user.agencyId, String(folderPath));
      return NextResponse.json({ success: true, folders: state.folders, photos: state.photos });
    }

    if (action === 'rename_folder') {
      const { folderPath, newName } = body;
      const trimmedName = String(newName || '').trim();
      if (!folderPath || !trimmedName) {
        return NextResponse.json({ error: 'Parâmetros insuficientes' }, { status: 400 });
      }

      const state = await getLibraryState(user.agencyId);
      const parentPath = String(folderPath).split('/').slice(0, -1).join('/');
      const nextPath = parentPath ? `${parentPath}/${trimmedName}` : trimmedName;

      if (state.folders.includes(nextPath) && nextPath !== folderPath) {
        return NextResponse.json({ error: 'Ja existe uma pasta com esse nome neste local' }, { status: 409 });
      }

      const nextState = await renameFolderForAgency(user.agencyId, String(folderPath), trimmedName);
      return NextResponse.json({
        success: true,
        folders: nextState.folders,
        photos: nextState.photos,
        folderCovers: nextState.folderCovers,
        orders: nextState.orders,
      });
    }

    if (action === 'rename_photo') {
      const { photoId, newName } = body;
      const trimmedName = String(newName || '').trim();
      if (!photoId || !trimmedName) {
        return NextResponse.json({ error: 'Parâmetros insuficientes' }, { status: 400 });
      }

      const state = await renamePhotoForAgency(user.agencyId, String(photoId), trimmedName);
      return NextResponse.json({ success: true, photos: state.photos });
    }

    if (action === 'set_folder_cover') {
      const { folderPath, coverUrl } = body;
      if (!folderPath) {
        return NextResponse.json({ error: 'Parâmetro insuficiente' }, { status: 400 });
      }

      const state = await setFolderCoverForAgency(user.agencyId, String(folderPath), String(coverUrl || ''));
      return NextResponse.json({ success: true, folderCovers: state.folderCovers });
    }

    const newPhoto = await createPhotoForAgency(user.agencyId, {
      folder: String(folder || ''),
      name: String(name || 'Foto'),
      url: String(url || ''),
    });
    return NextResponse.json(newPhoto);
  } catch (error) {
    console.error('Erro na biblioteca de mídia:', error);
    const message = error instanceof Error ? error.message : 'Erro na biblioteca de mídia';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
