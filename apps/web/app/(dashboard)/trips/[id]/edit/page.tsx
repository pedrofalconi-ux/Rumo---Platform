'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ItineraryItem {
  id: string;
  day: number;
  type: string;
  title: string;
  subTitle?: string;
  details?: string;
  image?: string;
  customSymbol?: string;
  meta?: {
    [key: string]: any;
  };
}

interface Trip {
  id: string;
  createdDate: string;
  name: string;
  destinations: string[];
  startDate: string;
  endDate: string;
  travelers: string[];
  status: 'Publicado' | 'Pendente' | 'Cancelado' | 'Confirmado';
  clientName: string;
  itinerary: ItineraryItem[];
  origin?: string;
  budget?: number;
  aiStatus?: 'NONE' | 'AI_GENERATING' | 'AI_DRAFT' | 'AI_REVIEWED' | 'AI_FAILED';
  aiGenerationId?: string;
  aiGeneratedAt?: string;
}

interface LibraryPhoto {
  id: string;
  folder: string;
  name: string;
  url: string;
}

interface MediaSearchResult {
  id: string;
  url: string;
  previewUrl: string;
  alt: string;
  credit: string;
}

interface AddOption {
  type: string;
  label: string;
  subText?: string;
  defaultSymbol: string;
  iconName: string;
  iconColor: string;
  category: 'Adicionar' | 'Importação';
}

const ADD_OPTIONS: AddOption[] = [
  // Adicionar
  { type: 'day_summary', label: 'Título, imagem e resumo do dia', defaultSymbol: 'calendar_today', iconName: 'calendar_today', iconColor: 'text-rose-500', category: 'Adicionar' },
  { type: 'trip_desc', label: 'Descrição da viagem', defaultSymbol: 'description', iconName: 'luggage', iconColor: 'text-amber-500', category: 'Adicionar' },
  { type: 'documents', label: 'Documentos de viagem', defaultSymbol: 'assignment', iconName: 'assignment', iconColor: 'text-rose-400', category: 'Adicionar' },
  { type: 'attachments', label: 'Anexos de viagem', defaultSymbol: 'attach_file', iconName: 'attach_file', iconColor: 'text-red-500', category: 'Adicionar' },
  { type: 'flight', label: 'Voos', defaultSymbol: 'flight', iconName: 'flight', iconColor: 'text-amber-500', category: 'Adicionar' },
  { type: 'activity', label: 'Tours & Atividades', defaultSymbol: 'explore', iconName: 'directions_walk', iconColor: 'text-rose-500', category: 'Adicionar' },
  { type: 'hotel', label: 'Acomodação', defaultSymbol: 'hotel', iconName: 'bed', iconColor: 'text-amber-600', category: 'Adicionar' },
  { type: 'places', label: 'Lugares', defaultSymbol: 'museum', iconName: 'museum', iconColor: 'text-yellow-600', category: 'Adicionar' },
  { type: 'suggested_places', label: 'Suggested places', defaultSymbol: 'star', iconName: 'star', iconColor: 'text-yellow-500', category: 'Adicionar' },
  { type: 'transport', label: 'Transporte', subText: 'Locação de carro, trem, transporte para o aeroporto, carro privativo, etc', defaultSymbol: 'directions_car', iconName: 'directions_car', iconColor: 'text-indigo-600', category: 'Adicionar' },
  { type: 'text', label: 'Texto livre', defaultSymbol: 'description', iconName: 'description', iconColor: 'text-amber-400', category: 'Adicionar' },
  { type: 'cruise', label: 'Cruzeiro', defaultSymbol: 'directions_boat', iconName: 'directions_boat', iconColor: 'text-red-500', category: 'Adicionar' },
  { type: 'services', label: 'Serviços', subText: 'Lounge, fast track, estacionamento, meet, etc.', defaultSymbol: 'local_activity', iconName: 'room_service', iconColor: 'text-sky-600', category: 'Adicionar' },
  { type: 'page_break', label: 'Quebra de página PDF', defaultSymbol: 'library_books', iconName: 'content_cut', iconColor: 'text-rose-400', category: 'Adicionar' },
  { type: 'price', label: 'Preço', defaultSymbol: 'sell', iconName: 'sell', iconColor: 'text-orange-500', category: 'Adicionar' },

  // Importação
  { type: 'import_itinerary', label: 'Modelo de itinerário', defaultSymbol: 'explore', iconName: 'route', iconColor: 'text-red-500', category: 'Importação' },
  { type: 'import_trips_excel', label: 'Trips from Excel', defaultSymbol: 'table_view', iconName: 'grid_on', iconColor: 'text-green-600', category: 'Importação' },
  { type: 'import_activities_excel', label: 'Atividades do Excel', defaultSymbol: 'table_view', iconName: 'grid_on', iconColor: 'text-green-600', category: 'Importação' },
  { type: 'import_travelers_excel', label: 'Travelers from Excel', defaultSymbol: 'table_view', iconName: 'grid_on', iconColor: 'text-green-600', category: 'Importação' },
];

const AVAILABLE_SYMBOLS = [
  { icon: 'coffee', label: 'Cafeteria', emoji: '☕' },
  { icon: 'restaurant', label: 'Restaurante', emoji: '🍽️' },
  { icon: 'local_bar', label: 'Bar / Pub', emoji: '🍸' },
  { icon: 'flight', label: 'Voo', emoji: '✈️' },
  { icon: 'hotel', label: 'Acomodação', emoji: '🏨' },
  { icon: 'museum', label: 'Museu / Atração', emoji: '🏛️' },
  { icon: 'explore', label: 'Tour / Passeio', emoji: '🚶' },
  { icon: 'directions_car', label: 'Transporte', emoji: '🚗' },
  { icon: 'directions_transit', label: 'Trem', emoji: '🚆' },
  { icon: 'directions_boat', label: 'Cruzeiro', emoji: '🚢' },
  { icon: 'beach_access', label: 'Praia', emoji: '🏖️' },
  { icon: 'forest', label: 'Natureza', emoji: '🌳' },
  { icon: 'shopping_bag', label: 'Compras', emoji: '🛍️' },
  { icon: 'local_activity', label: 'Serviço / Lazer', emoji: '🎟️' },
  { icon: 'sell', label: 'Preço', emoji: '🏷️' },
  { icon: 'description', label: 'Texto / Nota', emoji: '📄' },
  { icon: 'attach_file', label: 'Anexo / Doc', emoji: '📎' },
];

const getTypeLabel = (type: string) => {
  const option = ADD_OPTIONS.find(o => o.type === type);
  return option ? option.label : 'Item';
};

const getTravelerInitials = (name: string) => {
  const cleanedName = name.trim();
  if (!cleanedName) return '';

  const parts = cleanedName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};


export default function EditItineraryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const tripId = resolvedParams.id;
  const router = useRouter();
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal visibility states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTravelerModalOpen, setIsTravelerModalOpen] = useState(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [travelerName, setTravelerName] = useState('');
  const [pushForm, setPushForm] = useState({
    title: '',
    message: '',
  });
  const [inviteForm, setInviteForm] = useState({
    travelerName: '',
    email: '',
    phone: '',
    channel: 'email',
  });
  const [inviteUrl, setInviteUrl] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [regeneratingDay, setRegeneratingDay] = useState<number | null>(null);

  const handleExportPDF = () => {
    const wasPreview = isPreviewMode;
    setIsPreviewMode(true);
    setTimeout(() => {
      window.print();
      if (!wasPreview) {
        setIsPreviewMode(false);
      }
    }, 250);
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        .no-print { display: none !important; }
        body { padding: 0; background: white; }
        .print-only { display: block !important; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  // Form states for Add/Edit
  const [addItemType, setAddItemType] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [itemForm, setItemForm] = useState({
    title: '',
    subTitle: '',
    details: '',
    image: '',
    customSymbol: '',
  });

  const handleSelectAddType = (option: AddOption) => {
    setAddItemType(option.type);
    setItemForm({
      title: '',
      subTitle: '',
      details: '',
      image: '',
      customSymbol: option.defaultSymbol,
    });
  };

  // Library browse state
  const [libraryPhotos, setLibraryPhotos] = useState<LibraryPhoto[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchPhoto, setSearchPhoto] = useState('');
  
  // Modal internal library options
  const [browsingLibrary, setBrowsingLibrary] = useState(false);
  const [librarySourceTab, setLibrarySourceTab] = useState<'browse' | 'upload' | 'search'>('browse');
  const [onlineSearchTerm, setOnlineSearchTerm] = useState('');
  const [onlineSearchResults, setOnlineSearchResults] = useState<string[]>([]);
  const searchProvider = 'pixabay';
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const fetchTripData = async () => {
    try {
      const response = await fetch(`/api/trips/${tripId}`);
      if (response.ok) {
        const data: Trip = await response.json();
        setTrip(data);
        setItems(data.itinerary || []);
      } else {
        alert('Viagem não encontrada no banco.');
        router.push('/trips');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLibraryData = async () => {
    try {
      const response = await fetch('/api/library');
      if (response.ok) {
        const data = await response.json();
        setLibraryPhotos(data.photos || []);
        setFolders(data.folders || []);
        if (data.folders && data.folders.length > 0) {
          setSelectedFolder(data.folders[0]);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchTripData();
    fetchLibraryData();
  }, [tripId]);

  const saveItinerary = async (updatedItems: ItineraryItem[]) => {
    if (!trip) return;
    try {
      await fetch(`/api/trips/${tripId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itinerary: updatedItems,
        }),
      });
    } catch (error) {
      console.error('Erro ao salvar alterações no banco:', error);
    }
  };

  const saveTripPatch = async (patch: Partial<Trip>) => {
    const response = await fetch(`/api/trips/${tripId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });

    if (!response.ok) {
      throw new Error('Erro ao salvar viagem');
    }

    const updatedTrip: Trip = await response.json();
    setTrip(updatedTrip);
    setItems(updatedTrip.itinerary || []);
    return updatedTrip;
  };

  const handleGenerateWithAi = async () => {
    if (!trip) return;

    const hasManualItems = items.some((item) => !item.meta?.aiGenerated);
    if (hasManualItems) {
      const confirmed = window.confirm(
        'Gerar com IA substituira os blocos gerados anteriormente pela IA. Deseja continuar substituindo todo o roteiro?'
      );
      if (!confirmed) return;
    }

    setAiGenerating(true);
    try {
      const response = await fetch('/api/ai/itinerary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          options: { replaceExisting: true },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Nao foi possivel gerar o roteiro com IA.');
        return;
      }

      setTrip(data.trip);
      setItems(data.itinerary || []);
      alert('Roteiro gerado com sucesso. Revise o conteudo antes de publicar.');
    } catch (error) {
      console.error(error);
      alert('Erro de conexao ao gerar roteiro com IA.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleApproveAiDraft = async () => {
    try {
      const response = await fetch('/api/ai/itinerary/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Nao foi possivel aprovar o rascunho.');
        return;
      }
      setTrip(data.trip);
    } catch (error) {
      console.error(error);
      alert('Erro ao aprovar rascunho IA.');
    }
  };

  const handleRegenerateDay = async (dayNum: number) => {
    const instruction = window.prompt(
      `Instrucao opcional para regenerar o Dia ${dayNum} (deixe vazio para padrao):`,
      ''
    );
    if (instruction === null) return;

    setRegeneratingDay(dayNum);
    try {
      const response = await fetch('/api/ai/itinerary/regenerate-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          day: dayNum,
          instruction: instruction || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Nao foi possivel regenerar o dia.');
        return;
      }
      setTrip(data.trip);
      setItems(data.itinerary || []);
    } catch (error) {
      console.error(error);
      alert('Erro ao regenerar dia com IA.');
    } finally {
      setRegeneratingDay(null);
    }
  };

  const handleAddTraveler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;

    const initials = getTravelerInitials(travelerName);
    if (!initials) return;

    const currentTravelers = trip.travelers || [];
    const updatedTravelers = [...currentTravelers, initials];
    const nextClientName = currentTravelers.length === 0 ? travelerName.trim() : trip.clientName;

    try {
      await saveTripPatch({
        travelers: updatedTravelers,
        clientName: nextClientName,
      });
      setTravelerName('');
    } catch (error) {
      console.error(error);
      alert('Nao foi possivel adicionar o viajante.');
    }
  };

  const handleRemoveTraveler = async (indexToRemove: number) => {
    if (!trip) return;

    const updatedTravelers = (trip.travelers || []).filter((_, index) => index !== indexToRemove);

    try {
      await saveTripPatch({
        travelers: updatedTravelers,
      });
    } catch (error) {
      console.error(error);
      alert('Nao foi possivel remover o viajante.');
    }
  };

  const handleSendPushNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushForm.title || !pushForm.message) return;

    try {
      const response = await fetch(`/api/trips/${tripId}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pushForm),
      });

      if (!response.ok) {
        alert('Nao foi possivel emitir a notificacao.');
        return;
      }

      setPushForm({ title: '', message: '' });
      setIsPushModalOpen(false);
      alert('Notificacao enviada para a fila dos viajantes desta viagem.');
    } catch (error) {
      console.error(error);
      alert('Nao foi possivel emitir a notificacao.');
    }
  };

  const handleCreateTravelerInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteUrl('');

    try {
      const response = await fetch(`/api/trips/${tripId}/traveler-invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Nao foi possivel gerar o convite.');
        return;
      }

      setInviteUrl(data.url);
    } catch (error) {
      console.error(error);
      alert('Nao foi possivel gerar o convite.');
    }
  };

  const handleDeleteItem = (itemId: string) => {
    const updated = items.filter((item) => item.id !== itemId);
    setItems(updated);
    saveItinerary(updated);
  };

  const handleStartEditItem = (item: ItineraryItem) => {
    setEditingItem(item);
    setItemForm({
      title: item.title,
      subTitle: item.subTitle || '',
      details: item.details || '',
      image: item.image || '',
      customSymbol: item.customSymbol || (ADD_OPTIONS.find(o => o.type === item.type)?.defaultSymbol || 'explore'),
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const updated = items.map((item) => {
      if (item.id === editingItem.id) {
        return {
          ...item,
          title: itemForm.title,
          subTitle: itemForm.subTitle,
          details: itemForm.details,
          image: itemForm.image || undefined,
          customSymbol: itemForm.customSymbol || undefined,
        };
      }
      return item;
    });

    setItems(updated);
    saveItinerary(updated);
    setEditingItem(null);
    setItemForm({ title: '', subTitle: '', details: '', image: '', customSymbol: '' });
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addItemType) return;

    const newId = `item-${Date.now()}`;
    const newItem: ItineraryItem = {
      id: newId,
      day: activeDay,
      type: addItemType,
      title: itemForm.title,
      subTitle: itemForm.subTitle || undefined,
      details: itemForm.details || undefined,
      image: itemForm.image || undefined,
      customSymbol: itemForm.customSymbol || undefined,
      meta: addItemType === 'flight' ? {
        airline: 'Companhia Aérea',
        flightNumber: itemForm.subTitle || 'G3-100',
        origin: trip?.origin || 'São Paulo',
        destination: trip?.destinations[0] || 'Roma',
        departureTime: '12:00',
        arrivalTime: '14:00',
        duration: '2h',
      } : addItemType === 'hotel' ? {
        address: 'Endereço do hotel',
        rooms: '1 Quarto',
        checkin: '15:00',
      } : {
        type: 'Tour',
        duration: '2 horas',
      }
    };

    const updated = [...items, newItem];
    setItems(updated);
    saveItinerary(updated);
    
    // Close and reset states
    setIsModalOpen(false);
    setAddItemType(null);
    setItemForm({ title: '', subTitle: '', details: '', image: '', customSymbol: '' });
  };

  const handleSelectPhotoFromLibrary = (photoUrl: string) => {
    setItemForm((prev) => ({
      ...prev,
      image: photoUrl,
    }));
    setBrowsingLibrary(false);
  };

  // Convert local file upload to Base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setItemForm((prev) => ({
        ...prev,
        image: reader.result as string,
      }));
      setBrowsingLibrary(false);
    };
    reader.readAsDataURL(file);
  };

  // Live online search inside picker (Pixabay or LoremFlickr fallback)
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
      setOnlineSearchResults((data.results || []).map((image: MediaSearchResult) => image.url));
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

  const getDays = () => {
    const daysSet = new Set<number>();
    daysSet.add(1);
    daysSet.add(2);
    items.forEach((item) => daysSet.add(item.day));
    return Array.from(daysSet).sort((a, b) => a - b);
  };

  const filteredPhotos = libraryPhotos.filter(p => {
    const matchesFolder = !selectedFolder || p.folder === selectedFolder;
    const matchesSearch = p.name.toLowerCase().includes(searchPhoto.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex-1 py-20 text-center flex flex-col items-center justify-center gap-3">
        <span className="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
        <span className="text-sm font-semibold">Buscando roteiro no banco de dados local...</span>
      </div>
    );
  }

  if (!trip) return null;

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* HTML print stylesheet */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          aside, header, nav, .print-hidden {
            display: none !important;
          }
          main, .max-w-4xl {
            max-w: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .card-hover, .journey-node {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />

      {/* AI draft banner */}
      {trip?.aiStatus === 'AI_DRAFT' && !isPreviewMode && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-5 py-3.5 flex flex-wrap justify-between items-center gap-3 rounded-xl mb-6 print:hidden">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-sm mt-0.5">auto_awesome</span>
            <div>
              <p className="text-xs font-bold">Rascunho gerado por IA</p>
              <p className="text-[11px] opacity-80">
                Revise o conteudo antes de publicar. Voos e hoteis reservados devem ser adicionados manualmente.
              </p>
            </div>
          </div>
          <button
            onClick={handleApproveAiDraft}
            className="px-3.5 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-all"
          >
            Aprovar conteudo IA
          </button>
        </div>
      )}

      {aiGenerating && (
        <div className="bg-primary/10 border border-primary/20 text-primary px-5 py-3.5 flex items-center gap-2 rounded-xl mb-6 print:hidden">
          <span className="material-symbols-outlined animate-spin text-sm">sync</span>
          <span className="text-xs font-semibold">Gerando roteiro com IA...</span>
        </div>
      )}

      {/* Traveler Preview Mode Banner */}
      {isPreviewMode && (
        <div className="bg-primary text-on-primary px-5 py-3.5 flex justify-between items-center rounded-xl mb-6 shadow-md print:hidden">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">visibility</span>
            <span className="text-xs font-semibold">Modo de Visualização do Viajante (Controles e formulários ocultados)</span>
          </div>
          <button
            onClick={() => setIsPreviewMode(false)}
            className="px-3.5 py-1.5 bg-white text-primary text-xs font-bold rounded-lg hover:opacity-95 transition-all shadow-sm"
          >
            Voltar ao Editor
          </button>
        </div>
      )}

      {/* Print-Only Letterhead Header */}
      <div className="hidden print:flex items-center justify-between border-b-2 border-primary pb-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
            RV
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary">Rumo Viagens</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mt-0.5">Roteiro de Viagem Premium</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-primary">CÓDIGO: {trip.id}</p>
          <p className="text-[9px] text-gray-400 font-medium">Impresso em {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>
      {/* Header bar */}
      <section className="mb-8 flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-on-surface opacity-75">
            <Link href="/trips" className="hover:text-primary transition-colors">
              Viagens
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Editor de Itinerário</span>
          </div>
          <h2 className="font-headline-lg text-2xl font-bold text-primary mt-1">
            {trip.name}
          </h2>
          <div className="flex flex-wrap gap-2 items-center mt-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-sm">calendar_today</span>
              <span className="text-xs text-on-surface opacity-80 font-medium">
                {trip.startDate} a {trip.endDate}
              </span>
            </div>
            {trip.destinations && trip.destinations.length > 0 && (
              <div className="flex flex-wrap gap-1 ml-2 pl-2 border-l border-outline-variant">
                {trip.destinations.map((dest) => (
                  <span
                    key={dest}
                    className="bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded text-[10px] font-bold"
                  >
                    {dest}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 print-hidden">
          {!isPreviewMode ? (
            <>
              <button
                onClick={handleGenerateWithAi}
                disabled={aiGenerating}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60 text-xs font-bold transition-all"
              >
                <span className="material-symbols-outlined text-base">auto_awesome</span>
                <span>{aiGenerating ? 'Gerando...' : 'Gerar com IA'}</span>
              </button>
              <button 
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-low text-xs font-bold transition-all"
              >
                <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                <span>Exportar PDF</span>
              </button>
              <button 
                onClick={() => setIsPreviewMode(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-low text-xs font-bold transition-all"
              >
                <span className="material-symbols-outlined text-base">visibility</span>
                <span>Visualizar</span>
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsPreviewMode(false)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-low text-xs font-bold transition-all"
            >
              <span className="material-symbols-outlined text-base">edit</span>
              <span>Voltar ao Editor</span>
            </button>
          )}
          <button
            onClick={() => {
              setInviteForm((prev) => ({ ...prev, travelerName: trip.clientName || '' }));
              setInviteUrl('');
              setIsInviteModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-low text-xs font-bold transition-all"
          >
            <span className="material-symbols-outlined text-base">app_registration</span>
            <span>Convite App</span>
          </button>
          <button
            onClick={() => setIsPushModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary hover:opacity-90 text-xs font-bold transition-all"
          >
            <span className="material-symbols-outlined text-base">send</span>
            <span>Notificar App</span>
          </button>
        </div>
      </section>

      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[100] bg-on-background/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[560px] shadow-2xl rounded-xl border border-outline-variant overflow-hidden">
            <div className="px-6 py-5 border-b border-outline-variant flex items-start justify-between gap-4">
              <div>
                <h2 className="font-headline-md text-xl font-bold text-on-surface">Convite do app</h2>
                <p className="text-on-surface opacity-70 text-xs mt-1">
                  Gere um link unico para o viajante acessar esta viagem com a logo correta da agencia.
                </p>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors text-on-surface opacity-75"
                title="Fechar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateTravelerInvite} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs font-bold text-on-surface opacity-75">Nome do viajante</label>
                  <input
                    required
                    type="text"
                    value={inviteForm.travelerName}
                    onChange={(event) => setInviteForm((prev) => ({ ...prev, travelerName: event.target.value }))}
                    className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface opacity-75">E-mail</label>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="cliente@email.com"
                    className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface opacity-75">WhatsApp</label>
                  <input
                    type="text"
                    value={inviteForm.phone}
                    onChange={(event) => setInviteForm((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="+55 11 99999-9999"
                    className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs font-bold text-on-surface opacity-75">Canal principal</label>
                  <select
                    value={inviteForm.channel}
                    onChange={(event) => setInviteForm((prev) => ({ ...prev, channel: event.target.value }))}
                    className="border border-outline-variant rounded-lg p-2.5 text-xs bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  >
                    <option value="email">E-mail</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
              </div>

              {inviteUrl && (
                <div className="bg-surface-container-low border border-outline-variant rounded-lg p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Link do convite</p>
                  <p className="text-xs text-on-surface break-all">{inviteUrl}</p>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Acesse sua viagem pelo app: ${inviteUrl}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex mt-3 text-xs font-bold text-primary hover:underline"
                  >
                    Abrir compartilhamento no WhatsApp
                  </a>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2.5 border border-outline rounded-lg text-xs font-semibold hover:bg-surface-container"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-on-primary font-bold rounded-lg text-xs hover:opacity-90"
                >
                  Gerar convite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPushModalOpen && (
        <div className="fixed inset-0 z-[100] bg-on-background/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[520px] shadow-2xl rounded-xl border border-outline-variant overflow-hidden">
            <div className="px-6 py-5 border-b border-outline-variant flex items-start justify-between gap-4">
              <div>
                <h2 className="font-headline-md text-xl font-bold text-on-surface">Notificar viajantes</h2>
                <p className="text-on-surface opacity-70 text-xs mt-1">
                  Emita uma mensagem push para os usuarios vinculados a esta viagem.
                </p>
              </div>
              <button
                onClick={() => setIsPushModalOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors text-on-surface opacity-75"
                title="Fechar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSendPushNotification} className="p-6 space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface opacity-75">Titulo</label>
                <input
                  required
                  type="text"
                  value={pushForm.title}
                  onChange={(event) => setPushForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Ex: Lembrete de check-in"
                  className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface opacity-75">Mensagem</label>
                <textarea
                  required
                  rows={4}
                  value={pushForm.message}
                  onChange={(event) => setPushForm((prev) => ({ ...prev, message: event.target.value }))}
                  placeholder="Mensagem que sera exibida no app mobile do viajante."
                  className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsPushModalOpen(false)}
                  className="px-4 py-2.5 border border-outline rounded-lg text-xs font-semibold hover:bg-surface-container"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-on-primary font-bold rounded-lg text-xs hover:opacity-90"
                >
                  Emitir push
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Info Card Section */}
      <section className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-outline-variant p-5 rounded-xl shadow-sm col-span-2 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-on-surface opacity-70">Cliente / Viajante</span>
            <p className="font-bold text-sm text-on-surface mt-0.5">{trip.clientName}</p>
            <div className="flex -space-x-2 mt-2">
              <div className="w-7 h-7 rounded-full border border-white bg-primary text-white flex items-center justify-center text-[9px] font-bold">
                {(trip.travelers || [])[0] || 'V'}
              </div>
              {(trip.travelers || []).length > 1 && (
                <div className="w-7 h-7 rounded-full border border-white bg-slate-gray text-white flex items-center justify-center text-[9px] font-bold">
                  +{(trip.travelers || []).length - 1}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsTravelerModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-primary text-primary rounded-lg text-xs font-bold hover:bg-primary-container-alt transition-colors"
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            <span>Adicionar</span>
          </button>
        </div>

        <div className="bg-white border border-outline-variant p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-on-surface opacity-70">Status da Trip</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2.5 py-0.5 bg-status-active text-success border border-success/20 font-bold rounded text-[10px] uppercase">
                {trip.status}
              </span>
            </div>
          </div>
          <button className="p-2 hover:bg-surface-container-low rounded-full transition-colors text-on-surface">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </section>

      {/* TRAVELERS MODAL */}
      {isTravelerModalOpen && (
        <div className="fixed inset-0 z-[100] bg-on-background/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[520px] shadow-2xl rounded-xl border border-outline-variant overflow-hidden">
            <div className="px-6 py-5 border-b border-outline-variant flex items-start justify-between gap-4">
              <div>
                <h2 className="font-headline-md text-xl font-bold text-on-surface">
                  Viajantes da viagem
                </h2>
                <p className="text-on-surface opacity-70 text-xs mt-1">
                  Adicione nomes para gerar os avatares usados na lista de viagens.
                </p>
              </div>
              <button
                onClick={() => {
                  setTravelerName('');
                  setIsTravelerModalOpen(false);
                }}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors text-on-surface opacity-75"
                title="Fechar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <form onSubmit={handleAddTraveler} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface opacity-75">
                    Nome do viajante
                  </label>
                  <input
                    type="text"
                    value={travelerName}
                    onChange={(e) => setTravelerName(e.target.value)}
                    placeholder="Ex: Maria Silva"
                    className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!travelerName.trim()}
                  className="sm:self-end flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <span className="material-symbols-outlined text-base">person_add</span>
                  <span>Adicionar</span>
                </button>
              </form>

              <div className="border border-outline-variant rounded-xl overflow-hidden">
                {(trip.travelers || []).length > 0 ? (
                  <div className="divide-y divide-outline-variant">
                    {(trip.travelers || []).map((traveler, index) => (
                      <div key={`${traveler}-${index}`} className="flex items-center justify-between gap-3 p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center text-[11px] font-bold shrink-0">
                            {traveler}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-on-surface">
                              {index === 0 ? trip.clientName : `Viajante ${index + 1}`}
                            </p>
                            <p className="text-[10px] text-on-surface opacity-60">
                              Iniciais: {traveler}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTraveler(index)}
                          className="w-8 h-8 rounded-full hover:bg-error/10 text-error flex items-center justify-center transition-colors"
                          title="Remover viajante"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 px-4 text-center">
                    <span className="material-symbols-outlined text-3xl text-primary opacity-70">group_add</span>
                    <p className="text-xs text-on-surface opacity-65 mt-2">
                      Nenhum viajante cadastrado nesta viagem.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Itinerary Timeline Path */}
      <div className="relative pl-12">
        {/* Continuous dashed trail line */}
        <div className="absolute left-[15px] top-4 bottom-4 w-0 border-l-2 border-dashed border-outline-variant z-0"></div>

        {/* Days loop */}
        {getDays().map((dayNum) => {
          const dayItems = items.filter((i) => i.day === dayNum);

          return (
            <div key={dayNum} className="journey-node mb-12">
              {/* Timeline Marker */}
              <div className="absolute -left-12 top-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-sm shadow-md z-10">
                {dayNum}
              </div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-headline-md text-lg font-bold text-on-surface">Dia {dayNum} do Roteiro</h3>
                {!isPreviewMode && (
                  <button
                    type="button"
                    onClick={() => handleRegenerateDay(dayNum)}
                    disabled={regeneratingDay === dayNum || aiGenerating}
                    className="flex items-center gap-1 px-2.5 py-1 border border-violet-200 text-violet-700 rounded-lg text-[10px] font-bold hover:bg-violet-50 disabled:opacity-50 transition-all print:hidden"
                  >
                    <span className="material-symbols-outlined text-[14px]">autorenew</span>
                    {regeneratingDay === dayNum ? 'Regenerando...' : 'Regenerar dia (IA)'}
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-6">
                {dayItems.map((item) => (
                  <div key={item.id} className="relative">
                    {/* Visual Badge on the timeline path line */}
                    <div 
                      className="absolute -left-12 top-[24px] w-8 h-8 rounded-full bg-white border-2 border-primary flex items-center justify-center shadow-md z-10 transition-all hover:scale-110 cursor-pointer"
                      title={`Tipo: ${getTypeLabel(item.type)}`}
                    >
                      <span className="material-symbols-outlined text-primary text-[18px]">
                        {item.customSymbol || (ADD_OPTIONS.find(o => o.type === item.type)?.defaultSymbol || 'explore')}
                      </span>
                    </div>

                    <div
                      className="card-hover relative bg-white border border-outline-variant rounded-xl overflow-hidden transition-all hover:border-primary flex shadow-sm group"
                    >
                    {/* Hover Actions */}
                    {!isPreviewMode && (
                      <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity duration-200 z-10">
                        <button
                          onClick={() => handleStartEditItem(item)}
                          className="material-symbols-outlined text-[18px] p-1.5 hover:bg-surface-container-low text-primary rounded transition-colors"
                          title="Editar Item"
                        >
                          edit
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="material-symbols-outlined text-[18px] p-1.5 hover:bg-surface-container-low text-error rounded transition-colors"
                          title="Deletar Item"
                        >
                          delete
                        </button>
                      </div>
                    )}

                    {/* Image */}
                    {item.image && (
                      <div className="w-1/3 min-h-[160px] relative hidden sm:block">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-primary mb-2">
                          <span className="material-symbols-outlined text-[18px]">
                            {item.customSymbol || (ADD_OPTIONS.find(o => o.type === item.type)?.defaultSymbol || 'explore')}
                          </span>
                          <span className="font-bold text-[10px] uppercase tracking-wider">
                            {getTypeLabel(item.type)}
                          </span>
                        </div>

                        <h4 className="font-headline-sm text-base font-bold text-on-surface uppercase mb-1">
                          {item.title}
                        </h4>
                        {item.subTitle && (
                          <p className="text-xs text-on-surface opacity-75 mb-2 font-medium">
                            {item.subTitle}
                          </p>
                        )}
                        {item.details ? (
                          <p className="text-xs text-on-surface opacity-80 leading-relaxed max-w-xl">
                            {item.details}
                          </p>
                        ) : !isPreviewMode ? (
                          <p className="text-xs text-on-surface opacity-50 italic">
                            Sem descrição cadastrada. Clique no lápis para adicionar!
                          </p>
                        ) : null}

                        {/* Extra Metadata */}
                        {item.type === 'flight' && item.meta && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-outline-variant text-[11px]">
                            <div>
                              <p className="opacity-60 uppercase font-semibold">Partida</p>
                              <p className="font-bold">{item.meta.origin}</p>
                              <p className="font-bold text-primary">{item.meta.departureTime}</p>
                            </div>
                            <div>
                              <p className="opacity-60 uppercase font-semibold">Chegada</p>
                              <p className="font-bold">{item.meta.destination}</p>
                              <p className="font-bold text-primary">{item.meta.arrivalTime}</p>
                            </div>
                            <div>
                              <p className="opacity-60 uppercase font-semibold">Duração</p>
                              <p className="font-bold">{item.meta.duration}</p>
                            </div>
                          </div>
                        )}

                        {item.type === 'hotel' && item.meta && (
                          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-outline-variant text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-primary">
                                map
                              </span>
                              <span>{item.meta.address}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-primary">
                                schedule
                              </span>
                              <span>Check-in: {item.meta.checkin}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  </div>
                ))}

                {dayItems.length === 0 && (
                  <p className="text-xs text-on-surface opacity-60 italic ml-4">
                    Nenhum item adicionado para este dia.
                  </p>
                )}
              </div>

              {/* Add Button Connector to specific day */}
              {!isPreviewMode && (
                <div className="flex justify-start ml-4 mt-4 mb-8">
                  <button
                    onClick={() => {
                      setActiveDay(dayNum);
                      setIsModalOpen(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 border border-dashed border-outline-variant rounded-lg text-xs font-semibold text-primary hover:bg-primary-container-alt transition-colors"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                    <span>Adicionar item no Dia {dayNum}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Floating Add Day Button */}
        {!isPreviewMode && (
          <div className="flex justify-center mt-12 relative z-10">
            <button
              onClick={() => {
                const maxDay = getDays().reduce((a, b) => Math.max(a, b), 0);
                setActiveDay(maxDay + 1);
                setIsModalOpen(true);
              }}
              className="w-12 h-12 rounded-full bg-primary text-on-primary shadow-lg flex items-center justify-center hover:scale-105 hover:shadow-xl active:scale-[0.97] transition-all group"
              title="Adicionar Novo Dia"
            >
              <span className="material-symbols-outlined transition-transform group-hover:rotate-90">
                add
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ADD ITEM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-on-background/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[840px] shadow-2xl rounded-xl border border-outline-variant overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-outline-variant flex justify-between items-center shrink-0">
              <div>
                <h2 className="font-headline-md text-xl font-bold text-on-surface">
                  {browsingLibrary 
                    ? 'Escolher Foto para Item' 
                    : addItemType 
                      ? `Novo(a) ${addItemType === 'flight' ? 'Voo' : addItemType === 'hotel' ? 'Acomodação' : 'Atividade'}` 
                      : 'Adicionar ao Roteiro'}
                </h2>
                <p className="text-on-surface opacity-75 text-xs">
                  {browsingLibrary 
                    ? 'Selecione uma imagem da biblioteca local, faça upload ou pesquise online.' 
                    : addItemType 
                      ? 'Preencha o nome do item e salve. Você pode associar uma foto agora ou deixar para depois.' 
                      : 'Selecione o tipo de item que deseja incluir na trilha da viagem.'}
                </p>
              </div>
              <button
                onClick={() => {
                  if (browsingLibrary) {
                    setBrowsingLibrary(false);
                  } else {
                    setIsModalOpen(false);
                    setAddItemType(null);
                    setItemForm({ title: '', subTitle: '', details: '', image: '', customSymbol: '' });
                  }
                }}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors text-on-surface opacity-75"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {browsingLibrary ? (
                /* LIBRARY BROWSER PANEL WITH SEARCH & UPLOAD TABS */
                <div className="space-y-6">
                  {/* Tab selector */}
                  <div className="flex border-b border-outline-variant mb-4 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setLibrarySourceTab('browse')}
                      className={`flex-1 pb-2 border-b-2 text-center transition-colors ${
                        librarySourceTab === 'browse' ? 'border-primary text-primary' : 'border-transparent opacity-60'
                      }`}
                    >
                      Biblioteca Local
                    </button>
                    <button
                      type="button"
                      onClick={() => setLibrarySourceTab('upload')}
                      className={`flex-1 pb-2 border-b-2 text-center transition-colors ${
                        librarySourceTab === 'upload' ? 'border-primary text-primary' : 'border-transparent opacity-60'
                      }`}
                    >
                      Fazer Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setLibrarySourceTab('search')}
                      className={`flex-1 pb-2 border-b-2 text-center transition-colors ${
                        librarySourceTab === 'search' ? 'border-primary text-primary' : 'border-transparent opacity-60'
                      }`}
                    >
                      Pesquisa Online
                    </button>
                  </div>

                  {librarySourceTab === 'browse' && (
                    <div className="space-y-4">
                      {/* Folder Selection tabs */}
                      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-outline-variant">
                        {folders.map(folder => (
                          <button
                            type="button"
                            key={folder}
                            onClick={() => setSelectedFolder(folder)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                              selectedFolder === folder
                                ? 'bg-primary text-on-primary'
                                : 'bg-surface-container-low hover:bg-surface-container-high'
                            }`}
                          >
                            {folder}
                          </button>
                        ))}
                      </div>

                      {/* Photo Search */}
                      <input
                        type="text"
                        placeholder="Pesquisar foto pelo nome..."
                        value={searchPhoto}
                        onChange={(e) => setSearchPhoto(e.target.value)}
                        className="w-full border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                      />

                      {/* Photos Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {filteredPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            onClick={() => handleSelectPhotoFromLibrary(photo.url)}
                            className="border border-outline-variant rounded-lg overflow-hidden cursor-pointer hover:border-primary group transition-all"
                          >
                            <div className="h-32 bg-surface-container-high relative overflow-hidden">
                              <img
                                src={photo.url}
                                alt={photo.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            <div className="p-3 bg-white text-xs font-semibold truncate text-on-surface">
                              {photo.name}
                            </div>
                          </div>
                        ))}
                        {filteredPhotos.length === 0 && (
                          <p className="col-span-3 text-center text-xs text-on-surface opacity-60 py-6">
                            Nenhuma foto encontrada nesta pasta.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {librarySourceTab === 'upload' && (
                    <div className="space-y-4">
                      <label className="text-xs font-bold text-on-surface opacity-75">Upload do Computador</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="border border-dashed border-outline-variant rounded-lg p-6 text-xs w-full cursor-pointer bg-surface-container-low"
                      />
                    </div>
                  )}

                  {librarySourceTab === 'search' && (
                    <div className="space-y-4">
                      {/*
                      Search Provider Selector
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

                      Pixabay Key Config
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
                      <label className="text-xs font-bold text-on-surface opacity-75">Buscar fotos online</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={searchProvider === 'pixabay' ? 'Ex: Colosseum Rome, Paris hotel...' : 'Termo de pesquisa (ex: Paris, avião, hotel)...'}
                          value={onlineSearchTerm}
                          onChange={(e) => setOnlineSearchTerm(e.target.value)}
                          className="flex-1 border border-outline-variant rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          type="button"
                          disabled={isSearching}
                          onClick={handleOnlineSearchSubmit}
                          className="px-4 py-2 bg-secondary text-white text-xs font-bold rounded-lg hover:opacity-90 flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isSearching ? 'Buscando...' : 'Buscar'}
                        </button>
                      </div>

                      {searchError && (
                        <p className="text-[10px] font-semibold text-error bg-error/10 p-2 rounded-lg text-center">
                          {searchError}
                        </p>
                      )}

                      {/* Results grid */}
                      {isSearching ? (
                        <div className="flex flex-col items-center justify-center py-6 gap-2">
                          <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                          <span className="text-[10px] text-on-surface opacity-75">Carregando fotos...</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3 pt-2">
                          {onlineSearchResults.map((url, idx) => (
                            <div
                              key={idx}
                              onClick={() => handleSelectPhotoFromLibrary(url)}
                              className="h-20 border rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform border-outline-variant"
                            >
                              <img src={url} className="w-full h-full object-cover" alt="Live Result" />
                            </div>
                          ))}
                          {onlineSearchResults.length === 0 && !searchError && (
                            <p className="col-span-3 text-[10px] text-on-surface opacity-60 italic text-center py-4">
                              {searchProvider === 'pixabay'
                                ? 'Digite algo para buscar fotos no Pixabay.'
                                : 'Digite algo para buscar fotos online (imagens rápidas).'}
                            </p>
                          )}
                        </div>
                      )}
                      {searchProvider === 'pixabay' && onlineSearchResults.length > 0 && (
                        <p className="text-[9px] text-on-surface opacity-60 text-right mt-1">
                          Imagens fornecidas por Pixabay.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : addItemType ? (
                /* ADD ELEMENT FORM */
                <form onSubmit={handleCreateItem} className="space-y-6">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface opacity-75">
                      Nome / Título {addItemType === 'flight' ? 'do Voo' : addItemType === 'hotel' ? 'da Acomodação' : 'da Atividade'} *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder={`Ex: ${addItemType === 'flight' ? 'Voo de Conexão' : addItemType === 'hotel' ? 'Hotel Boutique Central' : 'Tour Guiado Coliseu'}`}
                      value={itemForm.title}
                      onChange={(e) => setItemForm(prev => ({ ...prev, title: e.target.value }))}
                      className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-on-surface opacity-75">Subtítulo (Identificador/Companhia)</label>
                      <input
                        type="text"
                        placeholder="Ex: G3-100 / Suíte Standard"
                        value={itemForm.subTitle}
                        onChange={(e) => setItemForm(prev => ({ ...prev, subTitle: e.target.value }))}
                        className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                      />
                    </div>

                    {/* Photo selection slot */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-on-surface opacity-75">Foto do Local</label>
                      <div className="flex gap-2 items-center">
                        {itemForm.image ? (
                          <div className="w-12 h-10 border rounded overflow-hidden relative bg-surface-container-high shrink-0">
                            <img src={itemForm.image} className="w-full h-full object-cover" alt="Preview" />
                          </div>
                        ) : (
                          <div className="w-12 h-10 border rounded bg-surface-container flex items-center justify-center text-[10px] text-on-surface opacity-55 shrink-0">
                            Sem Foto
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setLibrarySourceTab('browse');
                            setBrowsingLibrary(true);
                          }}
                          className="px-3 py-2 border border-outline rounded-lg text-xs font-semibold hover:bg-surface-container-low flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">photo_library</span>
                          <span>{itemForm.image ? 'Alterar Foto' : 'Escolher da Biblioteca'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Icon Selector / Symbol Picker */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-on-surface opacity-75">Símbolo / Ícone do Item</label>
                    <div className="grid grid-cols-6 sm:grid-cols-9 gap-2 p-3 bg-surface-container-low rounded-lg border border-outline-variant">
                      {AVAILABLE_SYMBOLS.map((sym) => {
                        const isSelected = itemForm.customSymbol === sym.icon;
                        return (
                          <button
                            key={sym.icon}
                            type="button"
                            onClick={() => setItemForm(prev => ({ ...prev, customSymbol: sym.icon }))}
                            className={`h-10 w-10 flex flex-col items-center justify-center rounded-lg transition-all ${
                              isSelected 
                                ? 'bg-primary text-on-primary shadow-md scale-105' 
                                : 'bg-white hover:bg-surface-container-high border border-outline-variant text-on-surface'
                            }`}
                            title={sym.label}
                          >
                            <span className="material-symbols-outlined text-[20px]">{sym.icon}</span>
                            <span className="text-[8px] font-medium opacity-65 truncate w-full px-0.5 text-center leading-none mt-0.5">
                              {sym.label.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface opacity-75">Descrição / Detalhes</label>
                    <textarea
                      placeholder="Insira detalhes da atividade, localizador, horários de check-in..."
                      value={itemForm.details}
                      onChange={(e) => setItemForm(prev => ({ ...prev, details: e.target.value }))}
                      rows={3}
                      className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-outline-variant">
                    <button
                      type="button"
                      onClick={() => setAddItemType(null)}
                      className="px-4 py-2.5 border border-outline rounded-lg text-xs font-semibold hover:bg-surface-container"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-primary text-on-primary font-bold rounded-lg text-xs hover:opacity-90 active:scale-[0.98]"
                    >
                      Salvar Item no Roteiro
                    </button>
                  </div>
                </form>
              ) : (
                /* TYPE SELECTION GRID */
                <div className="space-y-6">
                  {/* Adicionar Section */}
                  <div>
                    <h3 className="font-semibold text-xs text-primary uppercase tracking-[0.1em] mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">add_circle</span>
                      Adicionar
                    </h3>
                    
                    {/* Option groups */}
                    <div className="space-y-4">
                      {/* Top quick options: Resumo, Descrição, Documentos, Anexos */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ADD_OPTIONS.filter(o => o.category === 'Adicionar' && ['day_summary', 'trip_desc', 'documents', 'attachments'].includes(o.type)).map((option) => (
                          <div
                            key={option.type}
                            onClick={() => handleSelectAddType(option)}
                            className="flex items-center gap-3.5 p-3 border border-outline-variant rounded-lg hover:border-primary hover:bg-surface-container-low transition-all cursor-pointer group"
                          >
                            <div className={`w-9 h-9 flex items-center justify-center rounded bg-surface-container-low ${option.iconColor} group-hover:bg-primary group-hover:text-on-primary transition-colors shrink-0`}>
                              <span className="material-symbols-outlined text-[20px]">{option.iconName}</span>
                            </div>
                            <span className="text-xs font-semibold text-on-surface">{option.label}</span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-outline-variant my-4"></div>

                      {/* Main itinerary options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ADD_OPTIONS.filter(o => o.category === 'Adicionar' && !['day_summary', 'trip_desc', 'documents', 'attachments'].includes(o.type)).map((option) => (
                          <div
                            key={option.type}
                            onClick={() => handleSelectAddType(option)}
                            className="flex items-center gap-3.5 p-3 border border-outline-variant rounded-lg hover:border-primary hover:bg-surface-container-low transition-all cursor-pointer group"
                          >
                            <div className={`w-9 h-9 flex items-center justify-center rounded bg-surface-container-low ${option.iconColor} group-hover:bg-primary group-hover:text-on-primary transition-colors shrink-0`}>
                              <span className="material-symbols-outlined text-[20px]">{option.iconName}</span>
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-semibold text-on-surface truncate">{option.label}</span>
                              {option.subText && (
                                <span className="text-[10px] text-on-surface opacity-60 line-clamp-1 leading-normal">
                                  {option.subText}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Importação Section */}
                  <div className="border-t border-outline-variant pt-6">
                    <h3 className="font-semibold text-xs text-primary uppercase tracking-[0.1em] mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">publish</span>
                      Importação
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ADD_OPTIONS.filter(o => o.category === 'Importação').map((option) => (
                        <div
                          key={option.type}
                          onClick={() => handleSelectAddType(option)}
                          className="flex items-center gap-3.5 p-3 border border-outline-variant rounded-lg hover:border-primary hover:bg-surface-container-low transition-all cursor-pointer group"
                        >
                          <div className={`w-9 h-9 flex items-center justify-center rounded bg-surface-container-low ${option.iconColor} group-hover:bg-primary group-hover:text-on-primary transition-colors shrink-0`}>
                            <span className="material-symbols-outlined text-[20px]">{option.iconName}</span>
                          </div>
                          <span className="text-xs font-semibold text-on-surface">{option.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT ITEM MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] bg-on-background/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[840px] shadow-2xl rounded-xl border border-outline-variant overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-outline-variant flex justify-between items-center shrink-0">
              <div>
                <h2 className="font-headline-md text-xl font-bold text-on-surface">
                  {browsingLibrary 
                    ? 'Alterar Foto para Item' 
                    : `Editar ${editingItem.type === 'flight' ? 'Voo' : editingItem.type === 'hotel' ? 'Acomodação' : 'Atividade'}`}
                </h2>
                <p className="text-on-surface opacity-75 text-xs">
                  {browsingLibrary ? 'Selecione uma imagem da biblioteca, faça upload ou pesquise online.' : 'Modifique as informações do itinerário nos campos abaixo.'}
                </p>
              </div>
              <button
                onClick={() => {
                  if (browsingLibrary) {
                    setBrowsingLibrary(false);
                  } else {
                    setEditingItem(null);
                    setItemForm({ title: '', subTitle: '', details: '', image: '', customSymbol: '' });
                  }
                }}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors text-on-surface opacity-75"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {browsingLibrary ? (
                /* LIBRARY BROWSER PANEL WITH TABS */
                <div className="space-y-6">
                  {/* Tab selector */}
                  <div className="flex border-b border-outline-variant mb-4 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setLibrarySourceTab('browse')}
                      className={`flex-1 pb-2 border-b-2 text-center transition-colors ${
                        librarySourceTab === 'browse' ? 'border-primary text-primary' : 'border-transparent opacity-60'
                      }`}
                    >
                      Biblioteca Local
                    </button>
                    <button
                      type="button"
                      onClick={() => setLibrarySourceTab('upload')}
                      className={`flex-1 pb-2 border-b-2 text-center transition-colors ${
                        librarySourceTab === 'upload' ? 'border-primary text-primary' : 'border-transparent opacity-60'
                      }`}
                    >
                      Fazer Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setLibrarySourceTab('search')}
                      className={`flex-1 pb-2 border-b-2 text-center transition-colors ${
                        librarySourceTab === 'search' ? 'border-primary text-primary' : 'border-transparent opacity-60'
                      }`}
                    >
                      Pesquisa Online
                    </button>
                  </div>

                  {librarySourceTab === 'browse' && (
                    <div className="space-y-4">
                      {/* Folder Selection tabs */}
                      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-outline-variant">
                        {folders.map(folder => (
                          <button
                            type="button"
                            key={folder}
                            onClick={() => setSelectedFolder(folder)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                              selectedFolder === folder
                                ? 'bg-primary text-on-primary'
                                : 'bg-surface-container-low hover:bg-surface-container-high'
                            }`}
                          >
                            {folder}
                          </button>
                        ))}
                      </div>

                      {/* Photo Search */}
                      <input
                        type="text"
                        placeholder="Pesquisar foto pelo nome..."
                        value={searchPhoto}
                        onChange={(e) => setSearchPhoto(e.target.value)}
                        className="w-full border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                      />

                      {/* Photos Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {filteredPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            onClick={() => handleSelectPhotoFromLibrary(photo.url)}
                            className="border border-outline-variant rounded-lg overflow-hidden cursor-pointer hover:border-primary group transition-all"
                          >
                            <div className="h-32 bg-surface-container-high relative overflow-hidden">
                              <img
                                src={photo.url}
                                alt={photo.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            <div className="p-3 bg-white text-xs font-semibold truncate text-on-surface">
                              {photo.name}
                            </div>
                          </div>
                        ))}
                        {filteredPhotos.length === 0 && (
                          <p className="col-span-3 text-center text-xs text-on-surface opacity-60 py-6">
                            Nenhuma foto encontrada nesta pasta.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {librarySourceTab === 'upload' && (
                    <div className="space-y-4">
                      <label className="text-xs font-bold text-on-surface opacity-75">Upload do Computador</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="border border-dashed border-outline-variant rounded-lg p-6 text-xs w-full cursor-pointer bg-surface-container-low"
                      />
                    </div>
                  )}

                  {librarySourceTab === 'search' && (
                    <div className="space-y-4">
                      {/*
                      Search Provider Selector
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

                      Pixabay Key Config
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
                      <label className="text-xs font-bold text-on-surface opacity-75">Buscar fotos online</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={searchProvider === 'pixabay' ? 'Ex: Colosseum Rome, Paris hotel...' : 'Termo de pesquisa (ex: Paris, avião, hotel)...'}
                          value={onlineSearchTerm}
                          onChange={(e) => setOnlineSearchTerm(e.target.value)}
                          className="flex-1 border border-outline-variant rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          type="button"
                          disabled={isSearching}
                          onClick={handleOnlineSearchSubmit}
                          className="px-4 py-2 bg-secondary text-white text-xs font-bold rounded-lg hover:opacity-90 flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isSearching ? 'Buscando...' : 'Buscar'}
                        </button>
                      </div>

                      {searchError && (
                        <p className="text-[10px] font-semibold text-error bg-error/10 p-2 rounded-lg text-center">
                          {searchError}
                        </p>
                      )}

                      {/* Results grid */}
                      {isSearching ? (
                        <div className="flex flex-col items-center justify-center py-6 gap-2">
                          <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                          <span className="text-[10px] text-on-surface opacity-75">Carregando fotos...</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3 pt-2">
                          {onlineSearchResults.map((url, idx) => (
                            <div
                              key={idx}
                              onClick={() => handleSelectPhotoFromLibrary(url)}
                              className="h-20 border rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform border-outline-variant"
                            >
                              <img src={url} className="w-full h-full object-cover" alt="Live Result" />
                            </div>
                          ))}
                          {onlineSearchResults.length === 0 && !searchError && (
                            <p className="col-span-3 text-[10px] text-on-surface opacity-60 italic text-center py-4">
                              {searchProvider === 'pixabay'
                                ? 'Digite algo para buscar fotos no Pixabay.'
                                : 'Digite algo para buscar fotos online (imagens rápidas).'}
                            </p>
                          )}
                        </div>
                      )}
                      {searchProvider === 'pixabay' && onlineSearchResults.length > 0 && (
                        <p className="text-[9px] text-on-surface opacity-60 text-right mt-1">
                          Imagens fornecidas por Pixabay.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* EDIT FORM */
                <form onSubmit={handleSaveEdit} className="space-y-6">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface opacity-75">Nome / Título *</label>
                    <input
                      required
                      type="text"
                      value={itemForm.title}
                      onChange={(e) => setItemForm(prev => ({ ...prev, title: e.target.value }))}
                      className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-on-surface opacity-75">Subtítulo (Identificador)</label>
                      <input
                        type="text"
                        value={itemForm.subTitle}
                        onChange={(e) => setItemForm(prev => ({ ...prev, subTitle: e.target.value }))}
                        className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-on-surface opacity-75">Foto do Local</label>
                      <div className="flex gap-2 items-center">
                        {itemForm.image ? (
                          <div className="w-12 h-10 border rounded overflow-hidden relative bg-surface-container-high shrink-0">
                            <img src={itemForm.image} className="w-full h-full object-cover" alt="Preview" />
                          </div>
                        ) : (
                          <div className="w-12 h-10 border rounded bg-surface-container flex items-center justify-center text-[10px] text-on-surface opacity-55 shrink-0">
                            Sem Foto
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setLibrarySourceTab('browse');
                            setBrowsingLibrary(true);
                          }}
                          className="px-3 py-2 border border-outline rounded-lg text-xs font-semibold hover:bg-surface-container-low flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">photo_library</span>
                          <span>{itemForm.image ? 'Alterar Foto' : 'Escolher da Biblioteca'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Icon Selector / Symbol Picker */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-on-surface opacity-75">Símbolo / Ícone do Item</label>
                    <div className="grid grid-cols-6 sm:grid-cols-9 gap-2 p-3 bg-surface-container-low rounded-lg border border-outline-variant">
                      {AVAILABLE_SYMBOLS.map((sym) => {
                        const isSelected = itemForm.customSymbol === sym.icon;
                        return (
                          <button
                            key={sym.icon}
                            type="button"
                            onClick={() => setItemForm(prev => ({ ...prev, customSymbol: sym.icon }))}
                            className={`h-10 w-10 flex flex-col items-center justify-center rounded-lg transition-all ${
                              isSelected 
                                ? 'bg-primary text-on-primary shadow-md scale-105' 
                                : 'bg-white hover:bg-surface-container-high border border-outline-variant text-on-surface'
                            }`}
                            title={sym.label}
                          >
                            <span className="material-symbols-outlined text-[20px]">{sym.icon}</span>
                            <span className="text-[8px] font-medium opacity-65 truncate w-full px-0.5 text-center leading-none mt-0.5">
                              {sym.label.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface opacity-75">Descrição / Detalhes</label>
                    <textarea
                      value={itemForm.details}
                      onChange={(e) => setItemForm(prev => ({ ...prev, details: e.target.value }))}
                      rows={3}
                      className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-outline-variant">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(null);
                        setItemForm({ title: '', subTitle: '', details: '', image: '', customSymbol: '' });
                      }}
                      className="px-4 py-2.5 border border-outline rounded-lg text-xs font-semibold hover:bg-surface-container"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-primary text-on-primary font-bold rounded-lg text-xs hover:opacity-90"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
