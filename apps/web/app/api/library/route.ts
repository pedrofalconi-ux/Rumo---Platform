import { NextResponse } from 'next/server';
import { db } from '@rumo/db';

export async function GET() {
  try {
    const photos = db.photos.findMany();
    const folders = db.folders.findMany();
    const orders = (db as any).libraryOrder ? (db as any).libraryOrder.get() : {};
    const folderCovers = (db as any).folderCovers ? (db as any).folderCovers.get() : {};

    // Auto-populate missing covers using beautiful Unsplash default images
    const defaultFolderCovers: Record<string, string> = {
      'América': 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=600&q=80',
      'América/Orlando': 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=600&q=80',
      'América/Miami': 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80',
      'Brasil': 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=600&q=80',
      'Europa': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80',
      'Europa/Milão': 'https://images.unsplash.com/photo-1520175480921-4edfa2983e0f?auto=format&fit=crop&w=600&q=80',
      'Europa/Roma': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=600&q=80'
    };

    let hasChanges = false;
    const foldersWithoutCover = folders.filter(f => !folderCovers[f] || folderCovers[f].includes('picsum.photos') || folderCovers[f].includes('pixabay.com'));
    if (foldersWithoutCover.length > 0) {
      foldersWithoutCover.forEach((folderPath) => {
        if (defaultFolderCovers[folderPath]) {
          folderCovers[folderPath] = defaultFolderCovers[folderPath];
        } else {
          // Find root name fallback or use a general high quality travel image
          const rootFolder = folderPath.split('/')[0];
          folderCovers[folderPath] = defaultFolderCovers[rootFolder] || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80';
        }
        hasChanges = true;
      });

      if (hasChanges && (db as any).folderCovers) {
        (db as any).folderCovers.save(folderCovers);
      }
    }

    return NextResponse.json({ photos, folders, orders, folderCovers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar biblioteca';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, name, folder, url, draggedPath, targetPath, position } = body;
    
    if (action === 'create_folder') {
      const folderName = String(name || '').trim();
      if (!folderName) {
        return NextResponse.json({ error: 'Nome da pasta obrigatorio' }, { status: 400 });
      }

      if (db.folders.findMany().includes(folderName)) {
        return NextResponse.json({ error: 'Ja existe uma pasta com esse nome neste local' }, { status: 409 });
      }

      const createdFolderName = db.folders.create(folderName);
      return NextResponse.json({ success: true, folder: createdFolderName });
    } else if (action === 'move_folder') {
      if (!draggedPath || !targetPath || !position) {
        return NextResponse.json({ error: 'Parâmetros insuficientes' }, { status: 400 });
      }

      const folders = db.folders.findMany();
      const photos = db.photos.findMany();

      // 1. Identify the dragged folder and all its descendants
      const draggedPrefix = `${draggedPath}/`;
      const movedPaths = folders.filter(f => f === draggedPath || f.startsWith(draggedPrefix));
      
      // 2. Compute new paths for moved folders
      const draggedName = draggedPath.split('/').pop() || '';
      let newDraggedPath = draggedPath;
      
      if (position === 'inside') {
        newDraggedPath = `${targetPath}/${draggedName}`;
      } else {
        // 'before' or 'after' -> sibling of target
        const targetParts = targetPath.split('/');
        if (targetParts.length === 1) {
          newDraggedPath = draggedName; // root
        } else {
          const parentPath = targetParts.slice(0, -1).join('/');
          newDraggedPath = `${parentPath}/${draggedName}`;
        }
      }

      // Check for invalid moves (e.g. moving a folder inside itself or its descendants)
      if (targetPath === draggedPath || targetPath.startsWith(draggedPrefix)) {
        return NextResponse.json({ error: 'Movimento inválido: não é possível mover uma pasta para dentro de si mesma' }, { status: 400 });
      }

      // Check if folder name already exists at target location
      if (newDraggedPath !== draggedPath && folders.includes(newDraggedPath)) {
        return NextResponse.json({ error: `Já existe uma pasta com o nome "${draggedName}" no destino` }, { status: 400 });
      }

      // Create a mapping from old path to new path
      const pathMap: Record<string, string> = {};
      movedPaths.forEach(oldPath => {
        if (oldPath === draggedPath) {
          pathMap[oldPath] = newDraggedPath;
        } else {
          const relativePart = oldPath.substring(draggedPath.length); // e.g. "/Portugal"
          pathMap[oldPath] = `${newDraggedPath}${relativePart}`;
        }
      });

      // 3. Remove moved folders from the original list
      const remainingFolders = folders.filter(f => !movedPaths.includes(f));

      // 4. Find the insert index
      let insertIndex = remainingFolders.indexOf(targetPath);
      if (insertIndex === -1) {
        insertIndex = remainingFolders.length;
      }

      // Determine exact insertion point based on position
      if (position === 'after') {
        const targetPrefix = `${targetPath}/`;
        let lastDescendantIndex = insertIndex;
        for (let i = insertIndex + 1; i < remainingFolders.length; i++) {
          if (remainingFolders[i].startsWith(targetPrefix)) {
            lastDescendantIndex = i;
          } else {
            break;
          }
        }
        insertIndex = lastDescendantIndex + 1;
      } else if (position === 'inside') {
        // Insert right after the parent folder
        insertIndex = insertIndex + 1;
      }

      // 5. Build the new list of folders
      const newMovedPaths = movedPaths.map(oldPath => pathMap[oldPath]);
      const updatedFolders = [
        ...remainingFolders.slice(0, insertIndex),
        ...newMovedPaths,
        ...remainingFolders.slice(insertIndex)
      ];

      // Update all photos that belong to the moved folders
      const updatedPhotos = photos.map((photo: any) => {
        const matchingKey = Object.keys(pathMap).find(
          oldPath => photo.folder === oldPath || photo.folder.startsWith(`${oldPath}/`)
        );
        
        if (matchingKey) {
          let newFolder = photo.folder;
          if (photo.folder === matchingKey) {
            newFolder = pathMap[matchingKey];
          } else {
            const relativePart = photo.folder.substring(matchingKey.length);
            newFolder = `${pathMap[matchingKey]}${relativePart}`;
          }
          return { ...photo, folder: newFolder };
        }
        return photo;
      });

      // Write to DB
      db.folders.updateAll(updatedFolders);
      db.photos.updateAll(updatedPhotos);
      if ((db as any).folderCovers) {
        const covers = (db as any).folderCovers.get() as Record<string, string>;
        const updatedCovers: Record<string, string> = {};
        Object.entries(covers).forEach(([key, value]) => {
          const matchingKey = Object.keys(pathMap).find(oldPath => key === oldPath || key.startsWith(`${oldPath}/`));
          if (!matchingKey) {
            updatedCovers[key] = value;
            return;
          }
          const newKey = key === matchingKey ? pathMap[matchingKey] : `${pathMap[matchingKey]}${key.substring(matchingKey.length)}`;
          updatedCovers[newKey] = value;
        });
        (db as any).folderCovers.save(updatedCovers);
      }

      // Cascade update the custom orders
      if ((db as any).libraryOrder) {
        const orders = (db as any).libraryOrder.get() as Record<string, string[]>;
        const updatedOrders: Record<string, string[]> = {};
        
        Object.entries(orders).forEach(([key, items]) => {
          let newKey = key;
          const matchingKey = Object.keys(pathMap).find(oldPath => key === oldPath || key.startsWith(`${oldPath}/`));
          if (matchingKey) {
            if (key === matchingKey) {
              newKey = pathMap[matchingKey];
            } else {
              const relativePart = key.substring(matchingKey.length);
              newKey = `${pathMap[matchingKey]}${relativePart}`;
            }
          }
          
          const mappedItems = items.map(item => {
            if (item.startsWith('folder:')) {
              const folderPath = item.substring('folder:'.length);
              const match = Object.keys(pathMap).find(oldPath => folderPath === oldPath || folderPath.startsWith(`${oldPath}/`));
              if (match) {
                let newFolder = folderPath;
                if (folderPath === match) {
                  newFolder = pathMap[match];
                } else {
                  const relativePart = folderPath.substring(match.length);
                  newFolder = `${pathMap[match]}${relativePart}`;
                }
                return `folder:${newFolder}`;
              }
            }
            return item;
          });
          
          updatedOrders[newKey] = mappedItems;
        });
        
        (db as any).libraryOrder.save(updatedOrders);
      }

      return NextResponse.json({
        success: true,
        folders: updatedFolders,
        photos: updatedPhotos,
        orders: (db as any).libraryOrder ? (db as any).libraryOrder.get() : {},
        folderCovers: (db as any).folderCovers ? (db as any).folderCovers.get() : {},
      });
    } else if (action === 'update_order') {
      const { parentPath, itemIds } = body;
      if (parentPath === undefined || !itemIds) {
        return NextResponse.json({ error: 'Parâmetros insuficientes' }, { status: 400 });
      }
      const orders = (db as any).libraryOrder ? (db as any).libraryOrder.get() : {};
      orders[parentPath] = itemIds;
      if ((db as any).libraryOrder) {
        (db as any).libraryOrder.save(orders);
      }
      return NextResponse.json({ success: true, orders });
    } else if (action === 'move_photo') {
      const { photoId, targetFolder } = body;
      if (!photoId || targetFolder === undefined) {
        return NextResponse.json({ error: 'Parâmetros insuficientes' }, { status: 400 });
      }
      const photos = db.photos.findMany();
      const photoIndex = photos.findIndex((p: any) => p.id === photoId);
      if (photoIndex === -1) {
        return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 });
      }
      photos[photoIndex].folder = targetFolder;
      db.photos.updateAll(photos);
      return NextResponse.json({ success: true, photos });
    } else if (action === 'delete_photo') {
      const { photoId } = body;
      if (!photoId) {
        return NextResponse.json({ error: 'Parâmetro insuficiente' }, { status: 400 });
      }
      const photos = db.photos.findMany();
      const updatedPhotos = photos.filter((p: any) => p.id !== photoId);
      db.photos.updateAll(updatedPhotos);
      return NextResponse.json({ success: true, photos: updatedPhotos });
    } else if (action === 'delete_folder') {
      const { folderPath } = body;
      if (!folderPath) {
        return NextResponse.json({ error: 'Parâmetro insuficiente' }, { status: 400 });
      }
      const folders = db.folders.findMany();
      const photos = db.photos.findMany();
      
      const prefix = `${folderPath}/`;
      const toDelete = folders.filter(f => f === folderPath || f.startsWith(prefix));
      
      const updatedFolders = folders.filter(f => !toDelete.includes(f));
      const updatedPhotos = photos.filter((p: any) => !toDelete.includes(p.folder));
      
      db.folders.updateAll(updatedFolders);
      db.photos.updateAll(updatedPhotos);
      
      if ((db as any).libraryOrder) {
        const orders = (db as any).libraryOrder.get();
        toDelete.forEach(path => {
          delete orders[path];
        });
        (db as any).libraryOrder.save(orders);
      }
      if ((db as any).folderCovers) {
        const covers = (db as any).folderCovers.get();
        toDelete.forEach(path => {
          delete covers[path];
        });
        (db as any).folderCovers.save(covers);
      }
      
      return NextResponse.json({ success: true, folders: updatedFolders, photos: updatedPhotos });
    } else if (action === 'rename_folder') {
      const { folderPath, newName } = body;
      const trimmedName = String(newName || '').trim();
      if (!folderPath || !trimmedName) {
        return NextResponse.json({ error: 'Parâmetros insuficientes' }, { status: 400 });
      }

      const folders = db.folders.findMany();
      const photos = db.photos.findMany();
      const parts = folderPath.split('/');
      const parentPath = parts.slice(0, -1).join('/');
      const nextPath = parentPath ? `${parentPath}/${trimmedName}` : trimmedName;
      const prefix = `${folderPath}/`;

      if (folderPath !== nextPath && folders.includes(nextPath)) {
        return NextResponse.json({ error: 'Ja existe uma pasta com esse nome neste local' }, { status: 409 });
      }

      const updatedFolders = folders.map((folder) => {
        if (folder === folderPath) return nextPath;
        if (folder.startsWith(prefix)) return `${nextPath}${folder.substring(folderPath.length)}`;
        return folder;
      });

      const updatedPhotos = photos.map((photo: any) => {
        if (photo.folder === folderPath) return { ...photo, folder: nextPath };
        if (photo.folder.startsWith(prefix)) {
          return { ...photo, folder: `${nextPath}${photo.folder.substring(folderPath.length)}` };
        }
        return photo;
      });

      db.folders.updateAll(updatedFolders);
      db.photos.updateAll(updatedPhotos);

      let updatedCovers: Record<string, string> = {};
      if ((db as any).folderCovers) {
        const covers = (db as any).folderCovers.get() as Record<string, string>;
        Object.entries(covers).forEach(([key, value]) => {
          if (key === folderPath) {
            updatedCovers[nextPath] = value;
          } else if (key.startsWith(prefix)) {
            updatedCovers[`${nextPath}${key.substring(folderPath.length)}`] = value;
          } else {
            updatedCovers[key] = value;
          }
        });
        (db as any).folderCovers.save(updatedCovers);
      }

      let updatedOrders: Record<string, string[]> = {};
      if ((db as any).libraryOrder) {
        const orders = (db as any).libraryOrder.get() as Record<string, string[]>;
        Object.entries(orders).forEach(([key, items]) => {
          const mappedKey =
            key === folderPath
              ? nextPath
              : key.startsWith(prefix)
              ? `${nextPath}${key.substring(folderPath.length)}`
              : key;

          updatedOrders[mappedKey] = items.map((item) => {
            if (!item.startsWith('folder:')) return item;
            const itemPath = item.substring('folder:'.length);
            if (itemPath === folderPath) return `folder:${nextPath}`;
            if (itemPath.startsWith(prefix)) return `folder:${nextPath}${itemPath.substring(folderPath.length)}`;
            return item;
          });
        });
        (db as any).libraryOrder.save(updatedOrders);
      }

      return NextResponse.json({
        success: true,
        folders: updatedFolders,
        photos: updatedPhotos,
        folderCovers: updatedCovers,
        orders: updatedOrders,
      });
    } else if (action === 'rename_photo') {
      const { photoId, newName } = body;
      const trimmedName = String(newName || '').trim();
      if (!photoId || !trimmedName) {
        return NextResponse.json({ error: 'Parâmetros insuficientes' }, { status: 400 });
      }

      const photos = db.photos.findMany();
      const photoIndex = photos.findIndex((photo: any) => photo.id === photoId);
      if (photoIndex === -1) {
        return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 });
      }

      photos[photoIndex] = {
        ...photos[photoIndex],
        name: trimmedName,
      };
      db.photos.updateAll(photos);

      return NextResponse.json({ success: true, photos });
    } else if (action === 'set_folder_cover') {
      const { folderPath, coverUrl } = body;
      if (!folderPath) {
        return NextResponse.json({ error: 'ParÃ¢metro insuficiente' }, { status: 400 });
      }
      const folderCovers = (db as any).folderCovers.set(folderPath, coverUrl || '');
      return NextResponse.json({ success: true, folderCovers });
    } else {
      const newPhoto = db.photos.create({ folder, name, url });
      return NextResponse.json(newPhoto);
    }
  } catch (error) {
    console.error('Erro na biblioteca de mídia:', error);
    const message = error instanceof Error ? error.message : 'Erro na biblioteca de mídia';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
