'use client';

import React, { useState, useEffect } from 'react';

interface Photo {
  id: string;
  folder: string;
  name: string;
  url: string;
}

interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
}

interface GridItem {
  id: string; // "folder:path" or "photo:id"
  type: 'folder' | 'photo';
  name: string;
  path?: string; // for folder
  photo?: Photo; // for photo
}

interface FolderRow {
  path: string;
  name: string;
  level: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

interface MediaSearchResult {
  id: string;
  url: string;
  previewUrl: string;
  alt: string;
  credit: string;
}

// Extract all unique folder paths including parent paths
const getAllFolderPaths = (flatFolders: string[]): string[] => {
  const paths = new Set<string>();
  flatFolders.forEach(folder => {
    const parts = folder.split('/');
    let current = '';
    parts.forEach(part => {
      current = current ? `${current}/${part}` : part;
      paths.add(current);
    });
  });
  return Array.from(paths).sort();
};

// Convert a list of folder paths to a sorted tree structure.
const buildFolderTree = (flatFolders: string[]): FolderNode[] => {
  const roots: FolderNode[] = [];
  const map = new Map<string, FolderNode>();

  flatFolders.forEach(path => {
    const parts = path.split('/');
    let currentPath = '';
    
    parts.forEach((part, index) => {
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      
      if (!map.has(currentPath)) {
        const node: FolderNode = {
          name: part,
          path: currentPath,
          children: []
        };
        map.set(currentPath, node);
        
        if (index === 0) {
          roots.push(node);
        } else {
          const parentNode = map.get(parentPath);
          if (parentNode) {
            parentNode.children.push(node);
          }
        }
      }
    });
  });
  
  return roots;
};

// Flatten the tree into list rows based on active expand/collapse states.
const getFolderRows = (
  nodes: FolderNode[],
  expandedPaths: Record<string, boolean>,
  level = 0,
  rows: FolderRow[] = []
): FolderRow[] => {
  nodes.forEach(node => {
    const isExpanded = !!expandedPaths[node.path];
    rows.push({
      path: node.path,
      name: node.name,
      level,
      hasChildren: node.children.length > 0,
      isExpanded
    });
    if (isExpanded && node.children.length > 0) {
      getFolderRows(node.children, expandedPaths, level + 1, rows);
    }
  });
  return rows;
};

export default function LibraryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // Folder tree states
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({});
  const [parentFolder, setParentFolder] = useState('');
  
  // Drag and drop states (sidebar)
  const [draggedPath, setDraggedPath] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ path: string; position: 'before' | 'after' | 'inside' } | null>(null);
  
  // Grid drag and drop states
  const [orders, setOrders] = useState<Record<string, string[]>>({});
  const [folderCovers, setFolderCovers] = useState<Record<string, string>>({});
  const [draggedGridItem, setDraggedGridItem] = useState<{ item: GridItem; index: number } | null>(null);
  const [gridDropIndicator, setGridDropIndicator] = useState<{ targetId: string; position: 'before' | 'after' | 'inside'; index: number } | null>(null);

  // Folder/photo form states
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newPhotoName, setNewPhotoName] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [coverFolderPath, setCoverFolderPath] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  
  // Photo source selector
  const [photoSourceTab, setPhotoSourceTab] = useState<'upload' | 'search' | 'url'>('upload');
  
  // Live online image search
  const [onlineSearchTerm, setOnlineSearchTerm] = useState('');
  const [onlineSearchResults, setOnlineSearchResults] = useState<MediaSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLibrary = async () => {
    try {
      const response = await fetch('/api/library');
      if (response.ok) {
        const data = await response.json();
        setPhotos(data.photos || []);
        setFolders(data.folders || []);
        setOrders(data.orders || {});
        setFolderCovers(data.folderCovers || {});
        
        // Expand all folders by default on initial load
        const initialExpanded: Record<string, boolean> = {};
        data.folders?.forEach((f: string) => {
          initialExpanded[f] = true;
        });
        setExpandedPaths(initialExpanded);
      }
    } catch (error) {
      console.error('Erro ao buscar biblioteca:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const openFolderModal = () => {
    setParentFolder(activeFolder || '');
    setNewFolderName('');
    setShowFolderModal(true);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName) return;

    const finalPath = parentFolder ? `${parentFolder}/${newFolderName}` : newFolderName;

    try {
      const response = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_folder',
          name: finalPath,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFolders((prev) => [...prev, data.folder]);
        
        if (parentFolder) {
          setExpandedPaths(prev => ({ ...prev, [parentFolder]: true }));
        }
        
        setActiveFolder(data.folder);
        setNewFolderName('');
        setParentFolder('');
        setShowFolderModal(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoName || !newPhotoUrl) return;

    try {
      const response = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPhotoName,
          url: newPhotoUrl,
          folder: activeFolder,
        }),
      });

      if (response.ok) {
        const newPhoto = await response.json();
        setPhotos((prev) => [...prev, newPhoto]);
        setNewPhotoName('');
        setNewPhotoUrl('');
        setOnlineSearchTerm('');
        setOnlineSearchResults([]);
        setShowPhotoModal(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Converts uploaded local file to Base64 data URL
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewPhotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCoverFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const openCoverModal = (folderPath: string) => {
    setCoverFolderPath(folderPath);
    setCoverUrl(folderCovers[folderPath] || '');
    setOnlineSearchTerm('');
    setOnlineSearchResults([]);
    setSearchError('');
    setPhotoSourceTab('search');
    setShowCoverModal(true);
  };

  const handleSaveFolderCover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coverFolderPath) return;

    const response = await fetch('/api/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'set_folder_cover',
        folderPath: coverFolderPath,
        coverUrl,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      setFolderCovers(data.folderCovers || {});
      setShowCoverModal(false);
      setCoverFolderPath('');
      setCoverUrl('');
      setOnlineSearchTerm('');
      setOnlineSearchResults([]);
    }
  };

  // Queries the server-side image search provider.
  const handleOnlineSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onlineSearchTerm) return;
    setIsSearching(true);
    setSearchError('');

    try {
      const response = await fetch(`/api/media/search?q=${encodeURIComponent(onlineSearchTerm)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar imagens');
      }
      setOnlineSearchResults(data.results || []);
      if (!data.results?.length) {
        setSearchError('Nenhuma imagem encontrada para este termo.');
      }
    } catch (err) {
      console.error(err);
      setSearchError('Nao foi possivel buscar imagens agora. Tente outro termo em instantes.');
    } finally {
      setIsSearching(false);
    }

    /*
    if (searchProvider === 'pixabay') {
      const keyToUse = pixabayKey.trim();
      if (!keyToUse) {
        setSearchError('Por favor, configure sua chave API do Pixabay.');
        setIsSearching(false);
        return;
      }
      try {
        const response = await fetch(
          `https://pixabay.com/api/?key=${keyToUse}&q=${encodeURIComponent(onlineSearchTerm)}&image_type=photo&per_page=9`
        );
        if (!response.ok) {
          throw new Error('Erro na resposta da API');
        }
        const data = await response.json();
        if (data.hits && data.hits.length > 0) {
          const results = data.hits.map((hit: any) => hit.webformatURL);
          setOnlineSearchResults(results);
        } else {
          setOnlineSearchResults([]);
          setSearchError('Nenhuma foto encontrada para este termo no Pixabay.');
        }
      } catch (err) {
        console.error(err);
        setSearchError('Erro ao buscar no Pixabay. Verifique se a chave de API está correta.');
      } finally {
        setIsSearching(false);
      }
    } else {
      const results = [
        `https://loremflickr.com/600/400/${encodeURIComponent(onlineSearchTerm)}?random=1`,
        `https://loremflickr.com/600/400/${encodeURIComponent(onlineSearchTerm)}?random=2`,
        `https://loremflickr.com/600/400/${encodeURIComponent(onlineSearchTerm)}?random=3`,
        `https://loremflickr.com/600/400/${encodeURIComponent(onlineSearchTerm)}?random=4`,
        `https://loremflickr.com/600/400/${encodeURIComponent(onlineSearchTerm)}?random=5`,
        `https://loremflickr.com/600/400/${encodeURIComponent(onlineSearchTerm)}?random=6`
      ];
      setOnlineSearchResults(results);
      setIsSearching(false);
    }
    */
  };

  const toggleExpand = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPaths(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  // Drag and Drop (sidebar)
  const handleDragStart = (e: React.DragEvent, path: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', path);
    setTimeout(() => {
      setDraggedPath(path);
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    if (!draggedPath || draggedPath === targetPath) return;

    // Do not allow nested folders to drop in their own subfolders
    if (targetPath.startsWith(`${draggedPath}/`)) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const height = rect.height;

    let position: 'before' | 'after' | 'inside' = 'inside';
    if (relativeY < height * 0.25) {
      position = 'before';
    } else if (relativeY > height * 0.75) {
      position = 'after';
    }

    setDropIndicator({
      path: targetPath,
      position
    });
  };

  const handleDragLeave = () => {
    setDropIndicator(null);
  };

  const handleDragEnd = () => {
    setDraggedPath(null);
    setDropIndicator(null);
  };

  const handleDrop = async (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    if (!draggedPath || draggedPath === targetPath || !dropIndicator) {
      setDropIndicator(null);
      return;
    }

    const { position } = dropIndicator;
    setDropIndicator(null);

    try {
      const response = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move_folder',
          draggedPath,
          targetPath,
          position
        })
      });

      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders);
        setPhotos(data.photos);
        setOrders(data.orders || {});
        
        // Update activeFolder path if it was inside the moved node
        if (activeFolder === draggedPath) {
          const draggedName = draggedPath.split('/').pop() || '';
          let newActive = targetPath;
          if (position === 'inside') {
            newActive = `${targetPath}/${draggedName}`;
          } else {
            const targetParts = targetPath.split('/');
            newActive = targetParts.length === 1 ? draggedName : `${targetParts.slice(0, -1).join('/')}/${draggedName}`;
          }
          setActiveFolder(newActive);
        } else if (activeFolder.startsWith(`${draggedPath}/`)) {
          const relativePart = activeFolder.substring(draggedPath.length);
          const draggedName = draggedPath.split('/').pop() || '';
          let newParent = targetPath;
          if (position === 'inside') {
            newParent = `${targetPath}/${draggedName}`;
          } else {
            const targetParts = targetPath.split('/');
            newParent = targetParts.length === 1 ? draggedName : `${targetParts.slice(0, -1).join('/')}/${draggedName}`;
          }
          setActiveFolder(`${newParent}${relativePart}`);
        }
      } else {
        const errData = await response.json();
        alert(errData.error || 'Erro ao mover a pasta');
      }
    } catch (error) {
      console.error('Erro ao mover a pasta:', error);
    }
  };

  // Find a node inside the folder tree by path
  const findNodeByPath = (path: string, nodes: FolderNode[]): FolderNode | null => {
    if (!path) return null;
    for (const node of nodes) {
      if (node.path === path) return node;
      const found = findNodeByPath(path, node.children);
      if (found) return found;
    }
    return null;
  };

  // Grid Drag and Drop implementation
  const handleGridDragStart = (e: React.DragEvent, item: GridItem, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    setTimeout(() => {
      setDraggedGridItem({ item, index });
    }, 0);
  };

  const handleGridDragOver = (e: React.DragEvent, targetItem: GridItem, targetIndex: number) => {
    e.preventDefault();
    if (!draggedGridItem) return;
    if (draggedGridItem.item.id === targetItem.id) return;

    if (targetItem.type === 'folder' && targetItem.path) {
      if (draggedGridItem.item.type === 'folder' && draggedGridItem.item.path) {
        if (targetItem.path === draggedGridItem.item.path || targetItem.path.startsWith(`${draggedGridItem.item.path}/`)) {
          return; // invalid drop target
        }
      }
      
      const rect = e.currentTarget.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const relativeY = e.clientY - rect.top;
      
      const isInside =
        relativeX > rect.width * 0.15 &&
        relativeX < rect.width * 0.85 &&
        relativeY > rect.height * 0.15 &&
        relativeY < rect.height * 0.85;
        
      if (isInside) {
        setGridDropIndicator({
          targetId: targetItem.id,
          position: 'inside',
          index: targetIndex
        });
        return;
      }
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const position = relativeX < rect.width / 2 ? 'before' : 'after';

    setGridDropIndicator({
      targetId: targetItem.id,
      position,
      index: targetIndex
    });
  };

  const handleGridDragLeave = () => {
    setGridDropIndicator(null);
  };

  const handleGridDragEnd = () => {
    setDraggedGridItem(null);
    setGridDropIndicator(null);
  };

  const handleGridDrop = async (e: React.DragEvent, targetItem: GridItem, targetIndex: number) => {
    e.preventDefault();
    if (!draggedGridItem || !gridDropIndicator) {
      setGridDropIndicator(null);
      setDraggedGridItem(null);
      return;
    }

    const { item: draggedItem, index: draggedIndex } = draggedGridItem;
    const { position } = gridDropIndicator;

    setGridDropIndicator(null);
    setDraggedGridItem(null);

    // Case 1: Dropping inside a folder to move it
    if (position === 'inside' && targetItem.type === 'folder' && targetItem.path) {
      const destinationFolder = targetItem.path;
      
      if (draggedItem.type === 'photo' && draggedItem.photo) {
        try {
          const response = await fetch('/api/library', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'move_photo',
              photoId: draggedItem.photo.id,
              targetFolder: destinationFolder
            })
          });
          if (response.ok) {
            fetchLibrary();
          }
        } catch (error) {
          console.error(error);
        }
      } else if (draggedItem.type === 'folder' && draggedItem.path) {
        try {
          const response = await fetch('/api/library', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'move_folder',
              draggedPath: draggedItem.path,
              targetPath: destinationFolder,
              position: 'inside'
            })
          });
          if (response.ok) {
            fetchLibrary();
          }
        } catch (error) {
          console.error(error);
        }
      }
      return;
    }

    // Case 2: Reordering within the same folder
    const reorderedItems = [...orderedGridItems];
    reorderedItems.splice(draggedIndex, 1);
    
    let insertIndex = targetIndex;
    if (draggedIndex < targetIndex) {
      insertIndex = position === 'before' ? targetIndex - 1 : targetIndex;
    } else {
      insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
    }
    
    insertIndex = Math.max(0, Math.min(reorderedItems.length, insertIndex));
    reorderedItems.splice(insertIndex, 0, draggedItem);
    
    const newItemIds = reorderedItems.map(item => item.id);
    
    setOrders(prev => ({
      ...prev,
      [activeFolder]: newItemIds
    }));

    try {
      await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_order',
          parentPath: activeFolder,
          itemIds: newItemIds
        })
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Deseja realmente excluir esta foto?')) return;
    try {
      const response = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_photo',
          photoId
        })
      });
      if (response.ok) {
        fetchLibrary();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteFolder = async (folderPath: string) => {
    if (!confirm(`Deseja realmente excluir a pasta "${folderPath}" e todo o seu conteúdo?`)) return;
    try {
      const response = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_folder',
          folderPath
        })
      });
      if (response.ok) {
        if (activeFolder === folderPath || activeFolder.startsWith(`${folderPath}/`)) {
          setActiveFolder('');
        }
        fetchLibrary();
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Build the hierarchical trees and flatten visible items
  const folderTree = buildFolderTree(folders);
  const folderRows = getFolderRows(folderTree, expandedPaths);

  // 1. Gather children subfolders and photos of activeFolder
  let subfolders: { type: 'folder'; path: string; name: string }[] = [];
  if (!activeFolder) {
    subfolders = folderTree.map(node => ({
      type: 'folder',
      path: node.path,
      name: node.name
    }));
  } else {
    const currentNode = findNodeByPath(activeFolder, folderTree);
    if (currentNode) {
      subfolders = currentNode.children.map(node => ({
        type: 'folder',
        path: node.path,
        name: node.name
      }));
    }
  }

  const currentFolderPhotos = photos.filter(p => p.folder === activeFolder);

  // Combine into GridItems
  const rawGridItems: GridItem[] = [
    ...subfolders.map(sf => ({
      id: `folder:${sf.path}`,
      type: 'folder' as const,
      name: sf.name,
      path: sf.path
    })),
    ...currentFolderPhotos.map(p => ({
      id: `photo:${p.id}`,
      type: 'photo' as const,
      name: p.name,
      photo: p
    }))
  ];

  // 2. Sort items by custom order map
  const activeOrder = orders[activeFolder] || [];
  const orderedGridItems = [...rawGridItems].sort((a, b) => {
    const indexA = activeOrder.indexOf(a.id);
    const indexB = activeOrder.indexOf(b.id);
    
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  // 3. Filter by search term
  const filteredGridItems = orderedGridItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-6">
      {/* Header bar */}
      <div className="scroll-reveal flex justify-between items-end">
        <div>
          <h2 className="font-headline-lg text-2xl font-bold text-primary tracking-tight">BIBLIOTECA</h2>
          <p className="text-on-surface opacity-75 text-sm mt-1">
            Organize fotos de destinos e pontos de interesse para ilustrar seus roteiros de viagens.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openFolderModal}
            className="btn-interactive flex items-center gap-1.5 px-4 py-2 border border-outline rounded-lg text-xs font-bold hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-sm">create_new_folder</span>
            <span>Nova Pasta</span>
          </button>
          <button
            onClick={() => {
              setPhotoSourceTab('upload');
              setShowPhotoModal(true);
            }}
            className="btn-interactive flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">add_photo_alternate</span>
            <span>Adicionar Foto</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 flex items-center justify-center gap-2">
          <span className="material-symbols-outlined animate-spin">sync</span>
          <span>Carregando mídia...</span>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Folders List Sidebar */}
          <div className="scroll-reveal scroll-reveal-delay-100 col-span-12 md:col-span-4 lg:col-span-3 bg-white border border-outline-variant rounded-xl p-4 space-y-4 shadow-sm min-h-[300px]">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Pastas de Destinos</h3>
            <div className="space-y-1 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
              {/* Root Library Node */}
              <button
                onClick={() => setActiveFolder('')}
                className={`w-full flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-lg text-left transition-all ${
                  activeFolder === ''
                    ? 'bg-primary-container-alt text-primary border-l-4 border-primary font-bold'
                    : 'text-on-surface hover:bg-surface-container-low'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-primary/80">
                  grid_view
                </span>
                <span className="truncate flex-1 text-[11px]">Raiz da Biblioteca</span>
              </button>

              {folderRows.map((row) => {
                const isIndicator = dropIndicator && dropIndicator.path === row.path;
                const isInside = isIndicator && dropIndicator.position === 'inside';
                const isBefore = isIndicator && dropIndicator.position === 'before';
                const isAfter = isIndicator && dropIndicator.position === 'after';
                const isDragging = draggedPath === row.path;

                return (
                  <div
                    key={row.path}
                    draggable
                    onDragStart={(e) => handleDragStart(e, row.path)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, row.path)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, row.path)}
                    style={{ paddingLeft: `${row.level * 16}px` }}
                    className={`relative py-0.5 group transition-all ${
                      isDragging ? 'opacity-0 pointer-events-none' : ''
                    } ${
                      isBefore ? 'pt-2' : ''
                    } ${
                      isAfter ? 'pb-2' : ''
                    }`}
                  >
                    {/* Before Indicator Line */}
                    {isBefore && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary rounded-full z-10 pointer-events-none" />
                    )}

                    {/* Folder Row Item */}
                    <button
                      onClick={() => setActiveFolder(row.path)}
                      className={`w-full flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-lg text-left transition-all ${
                        activeFolder === row.path
                          ? 'bg-primary-container-alt text-primary border-l-4 border-primary'
                          : isInside
                          ? 'bg-primary/10 border border-primary border-dashed text-primary font-bold'
                          : 'text-on-surface hover:bg-surface-container-low'
                      }`}
                    >
                      {/* Expand / Collapse Indicator */}
                      {row.hasChildren ? (
                        <span
                          onClick={(e) => toggleExpand(row.path, e)}
                          className="material-symbols-outlined text-[16px] text-on-surface opacity-75 cursor-pointer hover:bg-surface-container-high rounded p-0.5"
                        >
                          {row.isExpanded ? 'expand_less' : 'expand_more'}
                        </span>
                      ) : (
                        <span className="w-5" />
                      )}

                      {/* Folder Symbol */}
                      <span className="material-symbols-outlined text-[16px] text-primary/80">
                        {row.isExpanded ? 'folder_open' : 'folder'}
                      </span>

                      <span className="truncate flex-1 text-[11px]">{row.name}</span>

                      {/* Drag indicator handle (visible on hover) */}
                      <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-40 cursor-grab select-none">
                        drag_indicator
                      </span>
                    </button>

                    {/* After Indicator Line */}
                    {isAfter && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full z-10 pointer-events-none" />
                    )}
                  </div>
                );
              })}

              {folders.length === 0 && (
                <p className="text-xs opacity-60 italic py-2">Nenhuma pasta criada.</p>
              )}
            </div>
            <p className="text-[10px] text-on-surface opacity-60 italic pt-2 border-t border-outline-variant/60 text-center">
              * Arraste itens para organizar a ordem ou solte dentro de pastas para mover.
            </p>
          </div>

          {/* Photo Gallery Canvas */}
          <div className="scroll-reveal scroll-reveal-delay-150 col-span-12 md:col-span-8 lg:col-span-9 bg-white border border-outline-variant rounded-xl p-6 shadow-sm space-y-6">
            {/* Gallery Top bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-outline-variant">
              <div className="space-y-1">
                {/* Breadcrumbs Navigation */}
                <div className="flex items-center gap-1 text-[11px] font-bold tracking-wide uppercase text-primary mb-1">
                  <button
                    onClick={() => setActiveFolder('')}
                    className="hover:text-coral transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">folder_special</span>
                    <span>Biblioteca</span>
                  </button>
                  {activeFolder ? (
                    activeFolder.split('/').map((part, index, arr) => {
                      const path = arr.slice(0, index + 1).join('/');
                      const isLast = index === arr.length - 1;
                      return (
                        <React.Fragment key={path}>
                          <span className="opacity-50 mx-1 text-on-surface">/</span>
                          {isLast ? (
                            <span className="text-coral font-extrabold">{part}</span>
                          ) : (
                            <button
                              onClick={() => setActiveFolder(path)}
                              className="hover:text-coral transition-colors"
                            >
                              {part}
                            </button>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-on-surface">
                    {activeFolder ? activeFolder.split('/').pop() : 'Biblioteca Principal'}
                  </h3>
                  {activeFolder && (
                    <button
                      type="button"
                      onClick={() => openCoverModal(activeFolder)}
                      className="p-1.5 rounded-lg border border-outline-variant text-primary hover:bg-primary hover:text-white transition-colors"
                      title="Alterar capa da pasta"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
                    </button>
                  )}
                </div>
                <p className="text-xs opacity-75">
                  Pasta contendo {subfolders.length} subpastas e {currentFolderPhotos.length} fotos.
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] opacity-75">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Pesquisar itens..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-interactive w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Grid of Folders and Photos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredGridItems.map((item, idx) => {
                const isFolder = item.type === 'folder';
                const isIndicator = gridDropIndicator && gridDropIndicator.targetId === item.id;
                const isInside = isIndicator && gridDropIndicator.position === 'inside';
                const isBefore = isIndicator && gridDropIndicator.position === 'before';
                const isAfter = isIndicator && gridDropIndicator.position === 'after';
                const isDragging = draggedGridItem && draggedGridItem.item.id === item.id;

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleGridDragStart(e, item, idx)}
                    onDragOver={(e) => handleGridDragOver(e, item, idx)}
                    onDragLeave={handleGridDragLeave}
                    onDrop={(e) => handleGridDrop(e, item, idx)}
                    onDragEnd={handleGridDragEnd}
                    className={`relative rounded-xl border border-outline-variant overflow-hidden shadow-sm group hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer flex flex-col justify-between ${
                      isDragging ? 'opacity-0 pointer-events-none' : ''
                    } ${
                      isInside ? 'ring-2 ring-primary bg-primary-container-alt/20 border-dashed border-primary scale-[1.04]' : 'bg-white'
                    }`}
                    style={{ height: '180px' }}
                    onClick={() => {
                      if (isFolder && item.path) {
                        setActiveFolder(item.path);
                      }
                    }}
                  >
                    {/* Before/After Drop Indicators */}
                    {isBefore && (
                      <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-primary z-20 pointer-events-none rounded-l-xl shadow-[0_0_8px_rgba(0,71,130,0.5)]" />
                    )}
                    {isAfter && (
                      <div className="absolute top-0 bottom-0 right-0 w-1.5 bg-primary z-20 pointer-events-none rounded-r-xl shadow-[0_0_8px_rgba(0,71,130,0.5)]" />
                    )}
                    {/* Top Content Area */}
                    {isFolder ? (
                      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-surface-container-low to-surface-container-high relative select-none overflow-hidden">
                        {item.path && (
                          <img
                            src={folderCovers[item.path] || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80'}
                            alt={item.name}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                        <div className="absolute inset-0 bg-primary/10 group-hover:bg-primary/25 transition-colors" />
                        <span className="material-symbols-outlined text-[64px] text-white drop-shadow-lg transition-transform duration-300 group-hover:scale-110 relative z-10">
                          folder
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.path) openCoverModal(item.path);
                          }}
                          className="absolute bottom-2 left-2 right-2 px-2 py-1.5 bg-white/95 text-primary rounded-lg shadow-sm opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-white transition-all text-[10px] font-bold flex items-center justify-center gap-1 z-20"
                          title="Alterar capa da pasta"
                        >
                          <span className="material-symbols-outlined text-[14px]">add_photo_alternate</span>
                          <span>Alterar capa</span>
                        </button>
                        
                        {/* Overlay Delete Button for Folder */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.path) handleDeleteFolder(item.path);
                          }}
                          className="btn-interactive absolute top-2 right-2 p-1.5 bg-white/95 text-error rounded-full shadow-sm opacity-0 group-hover:opacity-100 hover:bg-error hover:text-white transition-all transform hover:scale-105"
                          title="Excluir Pasta"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 bg-surface-container-high relative overflow-hidden select-none">
                        {item.photo && (
                          <img
                            src={item.photo.url}
                            alt={item.name}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        )}
                        
                        {/* Overlay Delete Button for Photo */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.photo) handleDeletePhoto(item.photo.id);
                          }}
                          className="btn-interactive absolute top-2 right-2 p-1.5 bg-white/95 text-error rounded-full shadow-sm opacity-0 group-hover:opacity-100 hover:bg-error hover:text-white transition-all transform hover:scale-105"
                          title="Excluir Foto"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    )}

                    {/* Bottom Label Area */}
                    <div className="p-3 bg-surface-container-lowest text-xs font-semibold truncate text-on-surface border-t border-outline-variant flex items-center justify-between">
                      <span className="truncate flex-1 select-none">{item.name}</span>
                      
                      {/* Type indicator */}
                      <span className="material-symbols-outlined text-[16px] opacity-25 group-hover:opacity-60 transition-opacity select-none cursor-grab">
                        {isFolder ? 'folder_open' : 'image'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredGridItems.length === 0 && (
                <div className="col-span-full py-16 text-center text-xs opacity-60 italic bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[36px] opacity-40">folder_open</span>
                  <span>Nenhum item cadastrado nesta pasta ou encontrado na busca.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NEW FOLDER MODAL */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-outline-variant shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-primary mb-4">Nova Pasta</h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-on-surface opacity-75">Pasta Mãe (Opcional)</label>
                <select
                  value={parentFolder}
                  onChange={(e) => setParentFolder(e.target.value)}
                  className="border border-outline-variant rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary outline-none bg-white font-semibold text-on-surface"
                >
                  <option value="">Nenhuma (Criar na Raiz)</option>
                  {getAllFolderPaths(folders).map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-on-surface opacity-75">Nome da Pasta *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Portugal ou Paris"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="border border-outline-variant rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-4 py-2 border border-outline rounded-lg text-xs font-semibold hover:bg-surface-container"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-90"
                >
                  Criar Pasta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOLDER COVER MODAL */}
      {showCoverModal && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-outline-variant shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-primary mb-1">Alterar capa da pasta</h3>
            <p className="text-[10px] opacity-75 mb-4 font-bold uppercase tracking-wider text-secondary">{coverFolderPath}</p>

            <div className="flex border-b border-outline-variant mb-4 text-xs font-bold">
              {[
                { id: 'upload', label: 'Upload' },
                { id: 'search', label: 'Buscar imagem' },
                { id: 'url', label: 'Colar URL' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setPhotoSourceTab(tab.id as 'upload' | 'search' | 'url');
                    setSearchError('');
                    setOnlineSearchResults([]);
                  }}
                  className={`flex-1 pb-2 border-b-2 text-center transition-colors ${
                    photoSourceTab === tab.id ? 'border-primary text-primary' : 'border-transparent opacity-60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveFolderCover} className="space-y-4">
              {photoSourceTab === 'upload' && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-on-surface opacity-75">Escolher arquivo do computador</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverFileUpload}
                    className="border border-dashed border-outline-variant rounded-lg p-3 text-xs w-full cursor-pointer bg-surface-container-low"
                  />
                </div>
              )}

              {photoSourceTab === 'search' && (
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-on-surface opacity-75">Buscar imagem na internet</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ex: Toscana, praia em Noronha, hotel em Lisboa..."
                      value={onlineSearchTerm}
                      onChange={(e) => setOnlineSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleOnlineSearchSubmit(e);
                        }
                      }}
                      className="flex-1 border border-outline-variant rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      disabled={isSearching}
                      onClick={handleOnlineSearchSubmit}
                      className="px-4 py-2 bg-primary text-on-primary text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98]"
                    >
                      {isSearching ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>

                  {searchError && (
                    <p className="text-[10px] font-semibold text-error bg-error/10 p-2 rounded-lg text-center">
                      {searchError}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    {onlineSearchResults.map((image) => (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => setCoverUrl(image.url)}
                        className={`h-20 border-2 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform relative ${
                          coverUrl === image.url ? 'border-primary' : 'border-outline-variant'
                        }`}
                      >
                        <img src={image.previewUrl} className="w-full h-full object-cover" alt={image.alt} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {photoSourceTab === 'url' && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-on-surface opacity-75">Endereço da imagem</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    className="border border-outline-variant rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              )}

              <div className="h-36 border border-outline-variant rounded-xl overflow-hidden bg-surface-container relative">
                <img 
                  src={coverUrl || folderCovers[coverFolderPath] || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80'} 
                  className="w-full h-full object-cover" 
                  alt="Prévia da capa" 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                {!coverUrl && (
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider z-10">
                    Capa Automática
                  </div>
                )}
              </div>

              <div className="flex justify-between gap-2 pt-4 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setCoverUrl('')}
                  className="px-4 py-2 border border-outline rounded-lg text-xs font-semibold hover:bg-surface-container"
                >
                  Remover capa
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCoverModal(false)}
                    className="px-4 py-2 border border-outline rounded-lg text-xs font-semibold hover:bg-surface-container"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-90"
                  >
                    Salvar capa
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW PHOTO MODAL */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-outline-variant shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-primary mb-1">Adicionar Foto à Pasta</h3>
            <p className="text-[10px] opacity-75 mb-4 font-bold uppercase tracking-wider text-secondary">Pasta Destino: {activeFolder}</p>
            
            {/* Tab Selector */}
            <div className="flex border-b border-outline-variant mb-4 text-xs font-bold">
              <button
                onClick={() => { setPhotoSourceTab('upload'); setNewPhotoUrl(''); }}
                className={`flex-1 pb-2 border-b-2 text-center transition-colors ${
                  photoSourceTab === 'upload' ? 'border-primary text-primary' : 'border-transparent opacity-60'
                }`}
              >
                Upload Local
              </button>
              <button
                onClick={() => { setPhotoSourceTab('search'); setNewPhotoUrl(''); }}
                className={`flex-1 pb-2 border-b-2 text-center transition-colors ${
                  photoSourceTab === 'search' ? 'border-primary text-primary' : 'border-transparent opacity-60'
                }`}
              >
                Pesquisar Online
              </button>
              <button
                onClick={() => { setPhotoSourceTab('url'); setNewPhotoUrl(''); }}
                className={`flex-1 pb-2 border-b-2 text-center transition-colors ${
                  photoSourceTab === 'url' ? 'border-primary text-primary' : 'border-transparent opacity-60'
                }`}
              >
                Colar URL
              </button>
            </div>

            <form onSubmit={handleAddPhoto} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-on-surface opacity-75">Nome Descritivo da Foto *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Pôr do sol no Duomo"
                  value={newPhotoName}
                  onChange={(e) => setNewPhotoName(e.target.value)}
                  className="border border-outline-variant rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              {photoSourceTab === 'upload' && (
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-on-surface opacity-75">Fazer Upload do Computador</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="border border-dashed border-outline-variant rounded-lg p-3 text-xs w-full cursor-pointer bg-surface-container-low"
                  />
                  {newPhotoUrl && (
                    <div className="border border-outline-variant rounded-lg overflow-hidden h-24 bg-surface-container relative">
                      <img src={newPhotoUrl} className="w-full h-full object-cover" alt="Uploaded Preview" />
                    </div>
                  )}
                </div>
              )}

              {photoSourceTab === 'search' && (
                <div className="space-y-3">
                  {/*
                  <div className="flex justify-between items-center bg-surface-container-low border border-outline-variant p-2.5 rounded-lg">
                    <span className="text-[10px] font-bold text-on-surface opacity-75">Provedor de Busca:</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSearchProvider('loremflickr');
                          setOnlineSearchResults([]);
                          setSearchError('');
                        }}
                        className={`px-2 py-1 rounded text-[9px] font-extrabold uppercase transition-colors ${
                          searchProvider === 'loremflickr' ? 'bg-secondary text-white' : 'bg-surface-container-high text-on-surface'
                        }`}
                      >
                        Busca Rápida
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchProvider('pixabay');
                          setOnlineSearchResults([]);
                          setSearchError('');
                        }}
                        className={`px-2 py-1 rounded text-[9px] font-extrabold uppercase transition-colors ${
                          searchProvider === 'pixabay' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'
                        }`}
                      >
                        Pixabay (HD)
                      </button>
                    </div>
                  </div>

                  {searchProvider === 'pixabay' && (
                    <div className="bg-surface-container-low border border-outline-variant p-2.5 rounded-lg space-y-1.5">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="font-bold text-on-surface opacity-75">Chave Pixabay API</span>
                        <a
                          href="https://pixabay.com/api/docs/"
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary font-bold hover:underline"
                        >
                          Obter chave grátis
                        </a>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder="Cole sua chave API aqui..."
                          value={pixabayKey}
                          onChange={(e) => setPixabayKey(e.target.value)}
                          className="flex-1 border border-outline-variant rounded p-1 text-[10px] outline-none"
                        />
                        <button
                          type="button"
                          onClick={savePixabayKey}
                          className="px-2.5 py-1 bg-outline text-on-surface text-[10px] font-bold rounded hover:opacity-90 transition-all"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  )}

                  */}
                  <label className="text-[11px] font-bold text-on-surface opacity-75">Buscar imagem na internet</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ex: Roma Coliseu, Veneza canais, hotel em Paris..."
                      value={onlineSearchTerm}
                      onChange={(e) => setOnlineSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleOnlineSearchSubmit(e);
                        }
                      }}
                      className="flex-1 border border-outline-variant rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      disabled={isSearching}
                      onClick={handleOnlineSearchSubmit}
                      className="px-4 py-2 bg-primary text-on-primary text-xs font-bold rounded-lg hover:opacity-90 flex items-center gap-1.5 disabled:opacity-50 transition-all active:scale-[0.98]"
                    >
                      {isSearching ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>

                  {searchError && (
                    <p className="text-[10px] font-semibold text-error bg-error/10 p-2 rounded-lg text-center">
                      {searchError}
                    </p>
                  )}

                  {isSearching ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-2">
                      <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                      <span className="text-[10px] text-on-surface opacity-75">Carregando fotos...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      {onlineSearchResults.map((image) => (
                        <div
                          key={image.id}
                          onClick={() => setNewPhotoUrl(image.url)}
                          className={`h-20 border-2 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform relative ${
                            newPhotoUrl === image.url ? 'border-primary' : 'border-outline-variant'
                          }`}
                        >
                          <img src={image.previewUrl} className="w-full h-full object-cover" alt={image.alt} />
                          <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] px-1.5 py-0.5 rounded">
                            {image.credit}
                          </span>
                        </div>
                      ))}
                      {onlineSearchResults.length === 0 && !searchError && (
                        <p className="col-span-3 text-[10px] text-on-surface opacity-60 italic text-center py-2">
                          Digite um destino, hotel ou ponto de interesse e escolha uma imagem.
                        </p>
                      )}
                    </div>
                  )}
                  {onlineSearchResults.length > 0 && (
                    <p className="text-[9px] text-on-surface opacity-60 text-right mt-1">
                      Imagens selecionadas da biblioteca online.
                    </p>
                  )}
                </div>
              )}

              {photoSourceTab === 'url' && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-on-surface opacity-75">Endereço/URL da Imagem</label>
                  <input
                    required={photoSourceTab === 'url'}
                    type="url"
                    placeholder="https://..."
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    className="border border-outline-variant rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => {
                    setShowPhotoModal(false);
                    setNewPhotoName('');
                    setNewPhotoUrl('');
                    setOnlineSearchTerm('');
                    setOnlineSearchResults([]);
                  }}
                  className="px-4 py-2 border border-outline rounded-lg text-xs font-semibold hover:bg-surface-container"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newPhotoUrl || !newPhotoName}
                  className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-50"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
