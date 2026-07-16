import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

export interface LibraryPhotoRecord {
  id: string;
  folder: string;
  name: string;
  url: string;
}

export interface LibraryState {
  photos: LibraryPhotoRecord[];
  folders: string[];
  orders: Record<string, string[]>;
  folderCovers: Record<string, string>;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const hasSupabaseServerAccess = Boolean(supabaseUrl && supabaseServiceRoleKey);
const SUPABASE_SERVER_TIMEOUT_MS = 5000;
const TABLE_CACHE_TTL_MS = 30_000;
const DEFAULT_SORT_ORDER = 2_147_483_647;

const tableReadinessCache = new Map<string, { ready: boolean; checkedAt: number }>();

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_SERVER_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

const supabaseAdmin = hasSupabaseServerAccess
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: fetchWithTimeout,
      },
    })
  : null;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function getParentPath(path: string) {
  const parts = path.split('/').filter(Boolean);
  return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
}

function compareStrings(a: string, b: string) {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
}

function comparePhotos(a: LibraryPhotoRecord, b: LibraryPhotoRecord) {
  return compareStrings(a.name, b.name) || compareStrings(a.id, b.id);
}

function compareFolders(a: string, b: string) {
  return compareStrings(a, b);
}

function buildDefaultFolderCovers(folders: string[], current: Record<string, string>) {
  const defaultFolderCovers: Record<string, string> = {
    'América': 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=600&q=80',
    'América/Orlando': 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=600&q=80',
    'América/Miami': 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80',
    'Brasil': 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=600&q=80',
    'Europa': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80',
    'Europa/Milão': 'https://images.unsplash.com/photo-1520175480921-4edfa2983e0f?auto=format&fit=crop&w=600&q=80',
    'Europa/Roma': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=600&q=80',
  };

  const next = { ...current };
  for (const folderPath of folders) {
    if (next[folderPath]) continue;
    const rootFolder = folderPath.split('/')[0] || folderPath;
    next[folderPath] =
      defaultFolderCovers[folderPath] ||
      defaultFolderCovers[rootFolder] ||
      'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80';
  }
  return next;
}

function createEmptyState(): LibraryState {
  return {
    photos: [],
    folders: [],
    orders: {},
    folderCovers: {},
  };
}

async function normalizeLegacyState(): Promise<LibraryState> {
  const { db } = await import('@rumo/db');
  const legacyPhotos = (db.photos.findMany() as any[]).map((photo) => ({
    id: isUuid(String(photo.id)) ? String(photo.id) : randomUUID(),
    folder: String(photo.folder || ''),
    name: String(photo.name || 'Foto'),
    url: String(photo.url || ''),
  }));
  const legacyFolders = [...(db.folders.findMany() as string[])].sort(compareFolders);
  const legacyOrders = (db as any).libraryOrder ? ((db as any).libraryOrder.get() as Record<string, string[]>) : {};
  const legacyFolderCovers = (db as any).folderCovers
    ? ((db as any).folderCovers.get() as Record<string, string>)
    : {};

  return {
    photos: legacyPhotos,
    folders: legacyFolders,
    orders: legacyOrders,
    folderCovers: buildDefaultFolderCovers(legacyFolders, legacyFolderCovers),
  };
}

function buildOrders(folders: string[], photos: LibraryPhotoRecord[], folderSort: Record<string, number>, photoSort: Record<string, number>) {
  const parents = new Set<string>(['']);
  folders.forEach((folder) => parents.add(getParentPath(folder)));
  photos.forEach((photo) => parents.add(photo.folder));

  const orders: Record<string, string[]> = {};

  parents.forEach((parentPath) => {
    const childFolders = folders
      .filter((folder) => getParentPath(folder) === parentPath)
      .sort((a, b) => {
        const sortA = folderSort[a] ?? DEFAULT_SORT_ORDER;
        const sortB = folderSort[b] ?? DEFAULT_SORT_ORDER;
        return sortA - sortB || compareFolders(a, b);
      })
      .map((folder) => `folder:${folder}`);

    const childPhotos = photos
      .filter((photo) => photo.folder === parentPath)
      .sort((a, b) => {
        const sortA = photoSort[a.id] ?? DEFAULT_SORT_ORDER;
        const sortB = photoSort[b.id] ?? DEFAULT_SORT_ORDER;
        return sortA - sortB || comparePhotos(a, b);
      })
      .map((photo) => `photo:${photo.id}`);

    if (childFolders.length > 0 || childPhotos.length > 0) {
      orders[parentPath] = [...childFolders, ...childPhotos];
    }
  });

  return orders;
}

function buildSortMaps(state: LibraryState) {
  const folderSort: Record<string, number> = {};
  const photoSort: Record<string, number> = {};

  for (const folder of state.folders) {
    folderSort[folder] = DEFAULT_SORT_ORDER;
  }
  for (const photo of state.photos) {
    photoSort[photo.id] = DEFAULT_SORT_ORDER;
  }

  Object.entries(state.orders).forEach(([_, itemIds]) => {
    itemIds.forEach((itemId, index) => {
      if (itemId.startsWith('folder:')) {
        folderSort[itemId.slice('folder:'.length)] = index;
      } else if (itemId.startsWith('photo:')) {
        photoSort[itemId.slice('photo:'.length)] = index;
      }
    });
  });

  return { folderSort, photoSort };
}

async function isTableReady(tableName: string) {
  if (!supabaseAdmin) return false;

  const cached = tableReadinessCache.get(tableName);
  const now = Date.now();
  if (cached && now - cached.checkedAt < TABLE_CACHE_TTL_MS) {
    return cached.ready;
  }

  try {
    const { error } = await supabaseAdmin.from(tableName).select('id').limit(1);
    const ready = !error;
    tableReadinessCache.set(tableName, { ready, checkedAt: now });
    return ready;
  } catch {
    tableReadinessCache.set(tableName, { ready: false, checkedAt: now });
    return false;
  }
}

async function loadSupabaseState(agencyId: string) {
  if (!supabaseAdmin) return null;
  const [foldersRes, photosRes] = await Promise.all([
    supabaseAdmin
      .from('library_folders')
      .select('path, cover_url, sort_order')
      .eq('agency_id', agencyId)
      .is('deleted_at', null),
    supabaseAdmin
      .from('library_photos')
      .select('id, folder_path, name, url, sort_order')
      .eq('agency_id', agencyId)
      .is('deleted_at', null),
  ]);

  if (foldersRes.error || photosRes.error) {
    return null;
  }

  const folders = (foldersRes.data || []).map((row: any) => String(row.path)).sort(compareFolders);
  const folderCovers = Object.fromEntries(
    (foldersRes.data || [])
      .filter((row: any) => row.cover_url)
      .map((row: any) => [String(row.path), String(row.cover_url)])
  ) as Record<string, string>;
  const photos = (photosRes.data || [])
    .map(
      (row: any): LibraryPhotoRecord => ({
        id: String(row.id),
        folder: String(row.folder_path || ''),
        name: String(row.name || 'Foto'),
        url: String(row.url || ''),
      })
    )
    .sort(comparePhotos);

  const folderSort = Object.fromEntries(
    (foldersRes.data || []).map((row: any) => [String(row.path), Number(row.sort_order || 0)])
  ) as Record<string, number>;
  const photoSort = Object.fromEntries(
    (photosRes.data || []).map((row: any) => [String(row.id), Number(row.sort_order || 0)])
  ) as Record<string, number>;

  return {
    photos,
    folders,
    orders: buildOrders(folders, photos, folderSort, photoSort),
    folderCovers: buildDefaultFolderCovers(folders, folderCovers),
  } satisfies LibraryState;
}

async function replaceSupabaseState(agencyId: string, state: LibraryState) {
  if (!supabaseAdmin) return state;

  const normalizedState: LibraryState = {
    folders: [...new Set(state.folders)].sort(compareFolders),
    photos: state.photos.map((photo) => ({
      ...photo,
      id: isUuid(photo.id) ? photo.id : randomUUID(),
      folder: String(photo.folder || ''),
      name: String(photo.name || 'Foto'),
      url: String(photo.url || ''),
    })),
    orders: state.orders,
    folderCovers: buildDefaultFolderCovers(state.folders, state.folderCovers),
  };

  const { folderSort, photoSort } = buildSortMaps(normalizedState);

  await supabaseAdmin.from('library_photos').delete().eq('agency_id', agencyId);
  await supabaseAdmin.from('library_folders').delete().eq('agency_id', agencyId);

  if (normalizedState.folders.length > 0) {
    const folderPayload = normalizedState.folders.map((path) => ({
      agency_id: agencyId,
      path,
      cover_url: normalizedState.folderCovers[path] || null,
      sort_order: folderSort[path] ?? 0,
      metadata: {},
      deleted_at: null,
    }));
    const { error } = await supabaseAdmin.from('library_folders').insert(folderPayload);
    if (error) throw error;
  }

  if (normalizedState.photos.length > 0) {
    const photoPayload = normalizedState.photos.map((photo) => ({
      id: photo.id,
      agency_id: agencyId,
      folder_path: photo.folder,
      name: photo.name,
      url: photo.url,
      sort_order: photoSort[photo.id] ?? 0,
      metadata: {},
      deleted_at: null,
    }));
    const { error } = await supabaseAdmin.from('library_photos').insert(photoPayload);
    if (error) throw error;
  }

  return normalizedState;
}

async function ensureLibraryState(agencyId: string) {
  const libraryTablesReady =
    supabaseAdmin && (await isTableReady('library_folders')) && (await isTableReady('library_photos'));

  if (!libraryTablesReady) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Persistencia da biblioteca indisponivel no Supabase');
    }

    return normalizeLegacyState();
  }

  const current = await loadSupabaseState(agencyId);
  if (current && (current.folders.length > 0 || current.photos.length > 0)) {
    return current;
  }

  const seedState =
    process.env.NODE_ENV === 'production' ? createEmptyState() : await normalizeLegacyState();
  const seeded = await replaceSupabaseState(agencyId, seedState);
  return seeded;
}

export async function getLibraryState(agencyId: string) {
  return ensureLibraryState(agencyId);
}

export async function createFolderForAgency(agencyId: string, folderPath: string) {
  const state = await ensureLibraryState(agencyId);
  if (!state.folders.includes(folderPath)) {
    state.folders.push(folderPath);
  }
  const next = await replaceSupabaseState(agencyId, state);
  return { folder: folderPath, state: next };
}

export async function createPhotoForAgency(
  agencyId: string,
  input: { folder: string; name: string; url: string }
) {
  const state = await ensureLibraryState(agencyId);
  const photo: LibraryPhotoRecord = {
    id: randomUUID(),
    folder: input.folder,
    name: input.name,
    url: input.url,
  };
  state.photos.push(photo);
  const next = await replaceSupabaseState(agencyId, state);
  return next.photos.find((entry) => entry.id === photo.id) || photo;
}

export async function setFolderCoverForAgency(agencyId: string, folderPath: string, coverUrl: string) {
  const state = await ensureLibraryState(agencyId);
  if (coverUrl) {
    state.folderCovers[folderPath] = coverUrl;
  } else {
    delete state.folderCovers[folderPath];
  }
  return replaceSupabaseState(agencyId, state);
}

export async function updateOrderForAgency(agencyId: string, parentPath: string, itemIds: string[]) {
  const state = await ensureLibraryState(agencyId);
  state.orders[parentPath] = itemIds.filter((itemId) => typeof itemId === 'string');
  return replaceSupabaseState(agencyId, state);
}

export async function movePhotoForAgency(agencyId: string, photoId: string, targetFolder: string) {
  const state = await ensureLibraryState(agencyId);
  state.photos = state.photos.map((photo) =>
    photo.id === photoId ? { ...photo, folder: targetFolder } : photo
  );
  return replaceSupabaseState(agencyId, state);
}

export async function deletePhotoForAgency(agencyId: string, photoId: string) {
  const state = await ensureLibraryState(agencyId);
  state.photos = state.photos.filter((photo) => photo.id !== photoId);
  Object.keys(state.orders).forEach((key) => {
    state.orders[key] = (state.orders[key] || []).filter((itemId) => itemId !== `photo:${photoId}`);
  });
  return replaceSupabaseState(agencyId, state);
}

export async function deleteFolderForAgency(agencyId: string, folderPath: string) {
  const state = await ensureLibraryState(agencyId);
  const prefix = `${folderPath}/`;
  const removedFolders = new Set(
    state.folders.filter((folder) => folder === folderPath || folder.startsWith(prefix))
  );
  state.folders = state.folders.filter((folder) => !removedFolders.has(folder));
  state.photos = state.photos.filter((photo) => !removedFolders.has(photo.folder));
  Object.keys(state.folderCovers).forEach((key) => {
    if (key === folderPath || key.startsWith(prefix)) {
      delete state.folderCovers[key];
    }
  });
  Object.keys(state.orders).forEach((key) => {
    if (key === folderPath || key.startsWith(prefix)) {
      delete state.orders[key];
      return;
    }
    state.orders[key] = (state.orders[key] || []).filter((itemId) => {
      if (!itemId.startsWith('folder:')) return true;
      const itemPath = itemId.slice('folder:'.length);
      return !removedFolders.has(itemPath);
    });
  });
  return replaceSupabaseState(agencyId, state);
}

export async function renamePhotoForAgency(agencyId: string, photoId: string, newName: string) {
  const state = await ensureLibraryState(agencyId);
  state.photos = state.photos.map((photo) =>
    photo.id === photoId ? { ...photo, name: newName } : photo
  );
  return replaceSupabaseState(agencyId, state);
}

export async function renameFolderForAgency(agencyId: string, folderPath: string, newName: string) {
  const state = await ensureLibraryState(agencyId);
  const parentPath = getParentPath(folderPath);
  const nextPath = parentPath ? `${parentPath}/${newName}` : newName;
  const prefix = `${folderPath}/`;

  state.folders = state.folders.map((folder) => {
    if (folder === folderPath) return nextPath;
    if (folder.startsWith(prefix)) return `${nextPath}${folder.substring(folderPath.length)}`;
    return folder;
  });
  state.photos = state.photos.map((photo) => {
    if (photo.folder === folderPath) return { ...photo, folder: nextPath };
    if (photo.folder.startsWith(prefix)) {
      return { ...photo, folder: `${nextPath}${photo.folder.substring(folderPath.length)}` };
    }
    return photo;
  });

  const nextCovers: Record<string, string> = {};
  Object.entries(state.folderCovers).forEach(([key, value]) => {
    if (key === folderPath) {
      nextCovers[nextPath] = value;
    } else if (key.startsWith(prefix)) {
      nextCovers[`${nextPath}${key.substring(folderPath.length)}`] = value;
    } else {
      nextCovers[key] = value;
    }
  });
  state.folderCovers = nextCovers;

  const nextOrders: Record<string, string[]> = {};
  Object.entries(state.orders).forEach(([key, items]) => {
    const mappedKey =
      key === folderPath ? nextPath : key.startsWith(prefix) ? `${nextPath}${key.substring(folderPath.length)}` : key;
    nextOrders[mappedKey] = items.map((itemId) => {
      if (!itemId.startsWith('folder:')) return itemId;
      const itemPath = itemId.slice('folder:'.length);
      if (itemPath === folderPath) return `folder:${nextPath}`;
      if (itemPath.startsWith(prefix)) return `folder:${nextPath}${itemPath.substring(folderPath.length)}`;
      return itemId;
    });
  });
  state.orders = nextOrders;

  return replaceSupabaseState(agencyId, state);
}

export async function moveFolderForAgency(
  agencyId: string,
  draggedPath: string,
  targetPath: string,
  position: 'before' | 'after' | 'inside'
) {
  const state = await ensureLibraryState(agencyId);
  const folders = [...state.folders];
  const photos = [...state.photos];
  const draggedPrefix = `${draggedPath}/`;
  const movedPaths = folders.filter((folder) => folder === draggedPath || folder.startsWith(draggedPrefix));
  const draggedName = draggedPath.split('/').pop() || '';

  let newDraggedPath = draggedPath;
  if (position === 'inside') {
    newDraggedPath = `${targetPath}/${draggedName}`;
  } else {
    const targetParts = targetPath.split('/');
    newDraggedPath =
      targetParts.length === 1 ? draggedName : `${targetParts.slice(0, -1).join('/')}/${draggedName}`;
  }

  const pathMap: Record<string, string> = {};
  movedPaths.forEach((oldPath) => {
    pathMap[oldPath] =
      oldPath === draggedPath ? newDraggedPath : `${newDraggedPath}${oldPath.substring(draggedPath.length)}`;
  });

  const remainingFolders = folders.filter((folder) => !movedPaths.includes(folder));
  let insertIndex = remainingFolders.indexOf(targetPath);
  if (insertIndex === -1) {
    insertIndex = remainingFolders.length;
  }
  if (position === 'after') {
    const targetPrefix = `${targetPath}/`;
    let lastDescendantIndex = insertIndex;
    for (let index = insertIndex + 1; index < remainingFolders.length; index += 1) {
      if (remainingFolders[index].startsWith(targetPrefix)) {
        lastDescendantIndex = index;
      } else {
        break;
      }
    }
    insertIndex = lastDescendantIndex + 1;
  } else if (position === 'inside') {
    insertIndex += 1;
  }

  state.folders = [
    ...remainingFolders.slice(0, insertIndex),
    ...movedPaths.map((oldPath) => pathMap[oldPath]),
    ...remainingFolders.slice(insertIndex),
  ];

  state.photos = photos.map((photo) => {
    const matchingKey = Object.keys(pathMap).find(
      (oldPath) => photo.folder === oldPath || photo.folder.startsWith(`${oldPath}/`)
    );
    if (!matchingKey) return photo;
    return {
      ...photo,
      folder:
        photo.folder === matchingKey
          ? pathMap[matchingKey]
          : `${pathMap[matchingKey]}${photo.folder.substring(matchingKey.length)}`,
    };
  });

  const nextCovers: Record<string, string> = {};
  Object.entries(state.folderCovers).forEach(([key, value]) => {
    const matchingKey = Object.keys(pathMap).find((oldPath) => key === oldPath || key.startsWith(`${oldPath}/`));
    if (!matchingKey) {
      nextCovers[key] = value;
      return;
    }
    nextCovers[
      key === matchingKey ? pathMap[matchingKey] : `${pathMap[matchingKey]}${key.substring(matchingKey.length)}`
    ] = value;
  });
  state.folderCovers = nextCovers;

  const nextOrders: Record<string, string[]> = {};
  Object.entries(state.orders).forEach(([key, items]) => {
    const matchingKey = Object.keys(pathMap).find((oldPath) => key === oldPath || key.startsWith(`${oldPath}/`));
    const mappedKey = !matchingKey
      ? key
      : key === matchingKey
        ? pathMap[matchingKey]
        : `${pathMap[matchingKey]}${key.substring(matchingKey.length)}`;

    nextOrders[mappedKey] = items.map((itemId) => {
      if (!itemId.startsWith('folder:')) return itemId;
      const itemPath = itemId.slice('folder:'.length);
      const itemMatch = Object.keys(pathMap).find(
        (oldPath) => itemPath === oldPath || itemPath.startsWith(`${oldPath}/`)
      );
      if (!itemMatch) return itemId;
      const nextPath =
        itemPath === itemMatch
          ? pathMap[itemMatch]
          : `${pathMap[itemMatch]}${itemPath.substring(itemMatch.length)}`;
      return `folder:${nextPath}`;
    });
  });
  state.orders = nextOrders;

  return replaceSupabaseState(agencyId, state);
}
