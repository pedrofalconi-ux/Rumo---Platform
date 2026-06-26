'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AMERICA_DESTINATIONS } from '@/lib/destinations/america-destinations';

const CITIES = AMERICA_DESTINATIONS;

const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

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

interface TripDocument {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
  size: number;
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
  coverImage?: string;
  aiStatus?: 'NONE' | 'AI_GENERATING' | 'AI_DRAFT' | 'AI_REVIEWED' | 'AI_FAILED';
  aiGenerationId?: string;
  aiGeneratedAt?: string;
  aiResponse?: {
    progress?: {
      daysGenerated?: number;
      failedDays?: Array<{ day: number; error: string }>;
    };
  };
  documents?: TripDocument[];
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

interface TripNotification {
  id: string;
  title: string;
  message: string;
  target?: string;
  recipients?: string[];
  priority?: string;
  category?: string;
  status?: string;
  createdAt?: string;
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

const getTrailMode = (item: ItineraryItem) => {
  const mode = item.meta?.routeFromPrevious?.mode;
  if (mode === 'car_or_transit' || item.type === 'transport') return 'car';
  return 'walk';
};

const getTrailConnectorIcon = (item: ItineraryItem) =>
  getTrailMode(item) === 'car' ? 'directions_car' : 'footprint';

const getTrailDistanceLabel = (item: ItineraryItem) => {
  const route = item.meta?.routeFromPrevious;
  if (!route) return '';

  const parts = [];
  if (typeof route.distanceKm === 'number') {
    parts.push(`${route.distanceKm.toLocaleString('pt-BR')} km`);
  }
  if (route.estimatedMinutes) {
    parts.push(`${route.estimatedMinutes} min`);
  }

  return parts.join(' • ');
};

const getItemLocation = (item: ItineraryItem) => {
  const location = item.meta?.location;
  if (location && typeof location === 'object') {
    return location as {
      name?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
    };
  }
  return null;
};

const buildUberRideUrl = (item: ItineraryItem) => {
  if (getTrailMode(item) !== 'car') return '';

  const location = getItemLocation(item);
  const hasCoordinates =
    typeof location?.latitude === 'number' && typeof location?.longitude === 'number';
  const addressLine1 = location?.name || item.meta?.originalTitle || item.title;
  const addressLine2 = location?.address || item.subTitle || '';

  if (!hasCoordinates && !addressLine1) return '';

  const dropoff = {
    ...(hasCoordinates
      ? { latitude: location?.latitude, longitude: location?.longitude }
      : {}),
    addressLine1,
    ...(addressLine2 ? { addressLine2 } : {}),
  };

  const params = new URLSearchParams({
    pickup: 'my_location',
    'drop[0]': JSON.stringify(dropoff),
  });
  const clientId = process.env.NEXT_PUBLIC_UBER_CLIENT_ID;
  if (clientId) {
    params.set('client_id', clientId);
  }

  return `https://m.uber.com/looking?${params.toString()}`;
};

const getTrailTheme = (type: string) => {
  if (type === 'day_summary') {
    return {
      node: 'bg-amber-50 border-amber-400 text-amber-700 ring-amber-100',
      card: 'border-amber-200 bg-amber-50/35',
      label: 'text-amber-700 bg-amber-100/70',
      rail: 'bg-amber-300',
    };
  }
  if (type === 'transport') {
    return {
      node: 'bg-sky-50 border-sky-400 text-sky-700 ring-sky-100',
      card: 'border-sky-200 bg-sky-50/35',
      label: 'text-sky-700 bg-sky-100/70',
      rail: 'bg-sky-300',
    };
  }
  if (type === 'places' || type === 'suggested_places') {
    return {
      node: 'bg-emerald-50 border-emerald-400 text-emerald-700 ring-emerald-100',
      card: 'border-emerald-200 bg-emerald-50/30',
      label: 'text-emerald-700 bg-emerald-100/70',
      rail: 'bg-emerald-300',
    };
  }
  if (type === 'activity') {
    return {
      node: 'bg-violet-50 border-violet-400 text-violet-700 ring-violet-100',
      card: 'border-violet-200 bg-violet-50/30',
      label: 'text-violet-700 bg-violet-100/70',
      rail: 'bg-violet-300',
    };
  }
  return {
    node: 'bg-white border-primary text-primary ring-primary/10',
    card: 'border-outline-variant bg-white',
    label: 'text-primary bg-primary/10',
    rail: 'bg-primary/40',
  };
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

interface SearchableCitySelectProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

const SearchableCitySelect: React.FC<SearchableCitySelectProps> = ({
  value,
  onChange,
  placeholder = "Selecione uma cidade"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Sync input text with current value when dropdown closes/changes
  useEffect(() => {
    if (!isOpen) {
      setSearch(value);
    }
  }, [value, isOpen]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const normalizedSearch = normalizeSearch(search);
  const filteredCities = CITIES.filter((city) =>
    normalizeSearch(city).includes(normalizedSearch)
  );

  return (
    <div ref={dropdownRef} className="relative flex-1 text-left">
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full border border-outline-variant rounded-lg p-2.5 pr-10 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white font-medium text-on-surface"
        />
        <span 
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[16px] text-on-surface opacity-75 cursor-pointer select-none"
        >
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-1 w-full bg-white border border-outline-variant rounded-lg shadow-lg overflow-hidden h-56 flex flex-col">
          <div className="overflow-y-auto flex-1 custom-scrollbar text-[11px]">
            {filteredCities.map(city => (
              <div
                key={city}
                onClick={() => {
                  onChange(city);
                  setSearch(city);
                  setIsOpen(false);
                }}
                className={`p-2.5 hover:bg-surface-container cursor-pointer transition-colors ${
                  value === city ? 'bg-primary/10 text-primary font-bold' : ''
                }`}
              >
                {city}
              </div>
            ))}
            {filteredCities.length === 0 && (
              <div className="p-3 text-center text-on-surface opacity-50 italic">
                Nenhuma cidade encontrada.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
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
    targetMode: 'all' as 'all' | 'specific',
    recipients: [] as string[],
    priority: 'normal' as 'normal' | 'high',
    category: 'general' as 'general' | 'reminder' | 'schedule_change' | 'alert',
  });
  const [pushActiveTab, setPushActiveTab] = useState<'compose' | 'history'>('compose');
  const [notifications, setNotifications] = useState<TripNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    travelerName: '',
    email: '',
    phone: '',
    channel: 'email',
  });
  const [inviteUrl, setInviteUrl] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isTripSettingsModalOpen, setIsTripSettingsModalOpen] = useState(false);
  const [tripSettingsForm, setTripSettingsForm] = useState({
    name: '',
    clientName: '',
    startDate: '',
    endDate: '',
    destinations: [] as string[],
    origin: '',
    budget: 0,
    status: 'Pendente' as Trip['status'],
    coverImage: '',
  });
  const [regeneratingDay, setRegeneratingDay] = useState<number | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

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
  const [coverPickerTab, setCoverPickerTab] = useState<'browse' | 'upload' | 'search'>('browse');
  const [coverSearchTerm, setCoverSearchTerm] = useState('');
  const [coverSearchResults, setCoverSearchResults] = useState<string[]>([]);
  const [isCoverSearching, setIsCoverSearching] = useState(false);
  const [coverSearchError, setCoverSearchError] = useState('');
  const isCoverPickerOpen = false;
  const setIsCoverPickerOpen = (_open: boolean) => {};

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

  useEffect(() => {
    if (!aiGenerating) return;

    const interval = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/trips/${tripId}`);
        if (!response.ok) return;

        const data: Trip = await response.json();
        setTrip(data);
        setItems(data.itinerary || []);
      } catch (error) {
        console.error('Erro ao atualizar progresso da IA:', error);
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, [aiGenerating, tripId]);

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

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setAiGenerating(true);
    setItems([]);

    try {
      const response = await fetch('/api/ai/itinerary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
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
      if (data.meta?.failedDays?.length) {
        alert(`Roteiro parcial gerado. Dias com falha: ${data.meta.failedDays.map((d: { day: number }) => d.day).join(', ')}.`);
      } else {
        alert('Roteiro gerado com sucesso. Revise o conteudo antes de publicar.');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('AI generation request aborted');
      } else {
        console.error(error);
        alert('Erro de conexao ao gerar roteiro com IA.');
      }
    } finally {
      setAiGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelAiGeneration = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setAiGenerating(false);
      abortControllerRef.current = null;

      try {
        await fetch(`/api/trips/${tripId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aiStatus: 'NONE' }),
        });
      } catch (err) {
        console.error('Failed to reset AI status on cancel:', err);
      }
      alert('Geração do roteiro com IA cancelada pelo usuário.');
    }
  };

  const handleStartEditingTitle = () => {
    if (!trip) return;
    setEditedTitle(trip.name);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!trip || !editedTitle.trim() || editedTitle === trip.name) {
      setIsEditingTitle(false);
      return;
    }

    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editedTitle.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setTrip(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsEditingTitle(false);
    }
  };

  const handleOpenTripSettings = () => {
    if (!trip) return;
    setTripSettingsForm({
      name: trip.name,
      clientName: trip.clientName,
      startDate: trip.startDate,
      endDate: trip.endDate,
      destinations: trip.destinations || [],
      origin: trip.origin || '',
      budget: trip.budget || 0,
      status: trip.status || 'Pendente',
      coverImage: trip.coverImage || '',
    });
    setIsTripSettingsModalOpen(true);
  };

  const handleSaveTripSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;

    const updatedData = {
      name: tripSettingsForm.name,
      clientName: tripSettingsForm.clientName,
      startDate: tripSettingsForm.startDate,
      endDate: tripSettingsForm.endDate,
      destinations: tripSettingsForm.destinations.map(d => d.trim()).filter(Boolean),
      origin: tripSettingsForm.origin,
      budget: Number(tripSettingsForm.budget),
      status: tripSettingsForm.status,
      coverImage: tripSettingsForm.coverImage,
    };

    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        const data = await response.json();
        setTrip(data);
        setIsTripSettingsModalOpen(false);
      } else {
        alert('Erro ao salvar informações da viagem.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro de conexão ao salvar informações da viagem.');
    }
  };

  const handleDocumentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !trip) return;

    setUploadingDoc(true);
    const uData = new FormData();
    uData.append('file', file);

    try {
      const response = await fetch(`/api/trips/${tripId}/documents/upload`, {
        method: 'POST',
        body: uData,
      });

      if (response.ok) {
        const docMeta = await response.json();
        
        // Add docMeta to trip.documents array and save
        const updatedDocuments = [...(trip.documents || []), docMeta];
        const updateResponse = await fetch(`/api/trips/${tripId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documents: updatedDocuments }),
        });

        if (updateResponse.ok) {
          const data = await updateResponse.json();
          setTrip(data);
        } else {
          alert('Erro ao associar o documento à viagem.');
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Erro ao enviar o documento.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao enviar o documento.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDocumentDelete = async (docId: string) => {
    if (!trip || !confirm('Tem certeza que deseja remover este documento?')) return;

    try {
      const updatedDocuments = (trip.documents || []).filter(d => d.id !== docId);
      const updateResponse = await fetch(`/api/trips/${tripId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: updatedDocuments }),
      });

      if (updateResponse.ok) {
        const data = await updateResponse.json();
        setTrip(data);
      } else {
        alert('Erro ao remover o documento da viagem.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao remover o documento.');
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

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const response = await fetch(`/api/trips/${tripId}/notifications`);
      if (!response.ok) return;
      const data: TripNotification[] = await response.json();
      setNotifications(data.reverse());
    } catch (error) {
      console.error('Nao foi possivel buscar notificacoes:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleOpenPushModal = () => {
    setPushActiveTab('compose');
    setIsPushModalOpen(true);
    fetchNotifications();
  };

  const togglePushRecipient = (traveler: string) => {
    setPushForm((prev) => {
      const recipients = prev.recipients.includes(traveler)
        ? prev.recipients.filter((item) => item !== traveler)
        : [...prev.recipients, traveler];
      return { ...prev, recipients };
    });
  };

  const handleSendPushNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushForm.title || !pushForm.message) return;
    if (pushForm.targetMode === 'specific' && pushForm.recipients.length === 0) {
      alert('Selecione ao menos um usuario para receber a notificacao.');
      return;
    }

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

      const notification = await response.json();
      setNotifications((prev) => [notification, ...prev]);
      setPushForm({
        title: '',
        message: '',
        targetMode: 'all',
        recipients: [],
        priority: 'normal',
        category: 'general',
      });
      setPushActiveTab('history');
      alert('Notificacao push adicionada a fila de envio.');
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

  const handleSaveCoverImage = async (imageUrl: string) => {
    if (isTripSettingsModalOpen) {
      setTripSettingsForm((prev) => ({
        ...prev,
        coverImage: imageUrl,
      }));
      setCoverSearchError('');
      return;
    }

    if (!trip) return;
    try {
      await saveTripPatch({ coverImage: imageUrl });
      setIsCoverPickerOpen(false);
      setCoverSearchError('');
    } catch (error) {
      console.error(error);
      alert('Nao foi possivel salvar a capa da viagem.');
    }
  };

  const handleCoverFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      handleSaveCoverImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCoverSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coverSearchTerm.trim()) return;

    setIsCoverSearching(true);
    setCoverSearchError('');
    try {
      const response = await fetch(`/api/media/search?q=${encodeURIComponent(coverSearchTerm)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar imagens');
      }
      const results = (data.results || []).map((image: MediaSearchResult) => image.url);
      setCoverSearchResults(results);
      if (!results.length) {
        setCoverSearchError('Nenhuma imagem encontrada para este termo.');
      }
    } catch (error) {
      console.error(error);
      setCoverSearchError('Nao foi possivel buscar imagens agora. Tente outro termo.');
    } finally {
      setIsCoverSearching(false);
    }
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
    <div className="pdf-shell max-w-4xl mx-auto py-8">
      {/* HTML print stylesheet */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4;
            margin: 14mm 12mm 16mm;
          }
          html {
            background: white !important;
          }
          body {
            background-color: white !important;
            color: #111827 !important;
            font-size: 10.5pt !important;
            line-height: 1.45 !important;
          }
          aside, header, nav, .print-hidden, .pdf-actions, .pdf-breadcrumb, .pdf-digital-only {
            display: none !important;
          }
          main, .max-w-4xl, .pdf-shell {
            max-w: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .pdf-letterhead {
            display: flex !important;
          }
          .pdf-cover {
            display: block !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 9mm !important;
          }
          .pdf-cover-panel {
            border: 1px solid #d7dee8 !important;
            border-radius: 16px !important;
            background: linear-gradient(135deg, #f8fbff 0%, #ffffff 58%, #eff6ff 100%) !important;
            padding: 9mm !important;
          }
          .pdf-cover-title {
            color: #0f3d73 !important;
            font-size: 25pt !important;
            line-height: 1.08 !important;
            letter-spacing: 0 !important;
            margin: 0 0 4mm !important;
            text-transform: none !important;
          }
          .pdf-cover-subtitle {
            color: #475569 !important;
            font-size: 10pt !important;
            margin: 0 !important;
          }
          .pdf-chip {
            border: 1px solid #cbd5e1 !important;
            background: white !important;
            color: #334155 !important;
            border-radius: 999px !important;
            padding: 2.5mm 4mm !important;
            font-size: 8.5pt !important;
            font-weight: 800 !important;
          }
          .pdf-trip-header {
            display: none !important;
          }
          .pdf-trip-header h2 {
            font-size: 20pt !important;
            line-height: 1.15 !important;
            color: #0f3d73 !important;
          }
          .pdf-trip-header .material-symbols-outlined {
            font-size: 12pt !important;
          }
          .pdf-info-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border: 1px solid #d7dee8 !important;
            box-shadow: none !important;
            border-radius: 12px !important;
            margin-bottom: 8mm !important;
          }
          .journey-node {
            break-inside: auto !important;
            page-break-inside: auto !important;
            margin-bottom: 7mm !important;
          }
          .journey-node + .journey-node {
            break-before: page !important;
            page-break-before: always !important;
          }
          .journey-node > div:first-child {
            break-after: avoid !important;
            page-break-after: avoid !important;
            margin-bottom: 4mm !important;
            border-bottom: 1px solid #d7dee8 !important;
            padding-bottom: 3mm !important;
          }
          .journey-node > div:first-child h3 {
            color: #0f3d73 !important;
            font-size: 16pt !important;
          }
          .card-hover {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-shadow: none !important;
            border-color: #d7dee8 !important;
            background: #ffffff !important;
            margin: 0 0 5mm 0 !important;
            border-radius: 12px !important;
          }
          .card-hover img {
            filter: none !important;
          }
          .card-hover h4 {
            color: #111827 !important;
            font-size: 12.5pt !important;
            line-height: 1.22 !important;
            letter-spacing: 0 !important;
          }
          .card-hover p {
            color: #334155 !important;
            opacity: 1 !important;
            font-size: 9.3pt !important;
            line-height: 1.5 !important;
          }
          .card-hover .rounded-full {
            box-shadow: none !important;
          }
          .pdf-trail-grid {
            grid-template-columns: 18mm minmax(0, 1fr) !important;
            gap: 4mm !important;
            min-height: auto !important;
          }
          .pdf-itinerary {
            break-before: page !important;
            page-break-before: always !important;
          }
          .pdf-node-button {
            width: 11mm !important;
            height: 11mm !important;
            margin-top: 2mm !important;
            box-shadow: none !important;
          }
          .pdf-node-button .material-symbols-outlined {
            font-size: 15pt !important;
          }
          .pdf-connector {
            display: none !important;
          }
          .pdf-card-media {
            width: 34mm !important;
            min-height: 30mm !important;
            display: block !important;
          }
          .pdf-card-body {
            padding: 5mm 5mm 5mm 6mm !important;
          }
          .pdf-item-label {
            padding: 1.5mm 2.5mm !important;
            margin-bottom: 2.5mm !important;
            border: 1px solid #e2e8f0 !important;
            background: #f8fafc !important;
          }
          .pdf-item-label span {
            color: #0f3d73 !important;
          }
          .pdf-add-day {
            display: none !important;
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
        <div className="bg-primary/10 border border-primary/20 text-primary px-5 py-3.5 flex justify-between items-center rounded-xl mb-6 print:hidden shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined animate-spin text-sm">sync</span>
            <span className="text-xs font-semibold">
              Gerando roteiro com IA...
              {trip?.aiResponse?.progress?.daysGenerated
                ? ` ${trip.aiResponse.progress.daysGenerated} dia(s) gerado(s), ${items.length} bloco(s) na trilha.`
                : ''}
            </span>
          </div>
          <button
            onClick={handleCancelAiGeneration}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 active:scale-95 shadow-sm"
          >
            <span className="material-symbols-outlined text-[12px] font-bold">close</span>
            Cancelar Geração
          </button>
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
      <div className="pdf-letterhead hidden print:flex items-center justify-between border-b-2 border-primary pb-6 mb-8">
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
      <div className="pdf-cover hidden print:block">
        <div className="pdf-cover-panel">
          <p className="text-[10px] uppercase tracking-widest font-black text-primary mb-3">Roteiro personalizado</p>
          <h1 className="pdf-cover-title font-headline-lg font-black">{trip.name}</h1>
          <p className="pdf-cover-subtitle">
            Preparado para {trip.clientName || 'viajante'} com uma trilha dia a dia, horários sugeridos,
            deslocamentos e recomendações práticas para aproveitar melhor a viagem.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            <span className="pdf-chip">{trip.startDate} a {trip.endDate}</span>
            <span className="pdf-chip">{getDays().length} dia(s) de roteiro</span>
            {trip.origin && <span className="pdf-chip">Origem: {trip.origin}</span>}
            {trip.destinations?.map((dest) => (
              <span key={dest} className="pdf-chip">{dest}</span>
            ))}
          </div>
        </div>
      </div>
      {/* Header bar */}
      <section className="pdf-trip-header mb-8 flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="pdf-breadcrumb flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-on-surface opacity-75">
            <Link href="/trips" className="hover:text-primary transition-colors">
              Viagens
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Editor de Itinerário</span>
          </div>
          {isEditingTitle ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
              autoFocus
              className="font-headline-lg text-2xl font-bold text-primary mt-1 bg-transparent border-b border-primary focus:outline-none w-full max-w-lg"
            />
          ) : (
            <h2
              onClick={handleStartEditingTitle}
              className="font-headline-lg text-2xl font-bold text-primary mt-1 cursor-pointer hover:underline decoration-dashed decoration-primary/45 flex items-center gap-2 group"
              title="Clique para editar o título"
            >
              {trip.name}
              <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-75 transition-opacity text-primary">edit</span>
            </h2>
          )}
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
        <div className="pdf-actions flex items-center gap-2 print-hidden">
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
            onClick={handleOpenPushModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary hover:opacity-90 text-xs font-bold transition-all"
          >
            <span className="material-symbols-outlined text-base">send</span>
            <span>Notificações</span>
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
          <div className="bg-white w-full max-w-[760px] shadow-2xl rounded-xl border border-outline-variant overflow-hidden">
            <div className="px-6 py-5 border-b border-outline-variant flex items-start justify-between gap-4">
              <div>
                <h2 className="font-headline-md text-xl font-bold text-on-surface">Notificações push</h2>
                <p className="text-on-surface opacity-70 text-xs mt-1">
                  Emita avisos para todos os viajantes ou para usuários específicos desta viagem.
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

            <div className="px-6 pt-4 border-b border-outline-variant">
              <div className="inline-flex rounded-lg bg-surface-container-low p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPushActiveTab('compose')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-2 transition-colors ${
                    pushActiveTab === 'compose' ? 'bg-white text-primary shadow-sm' : 'text-on-surface opacity-70'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">campaign</span>
                  Emitir push
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPushActiveTab('history');
                    fetchNotifications();
                  }}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-2 transition-colors ${
                    pushActiveTab === 'history' ? 'bg-white text-primary shadow-sm' : 'text-on-surface opacity-70'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">notifications</span>
                  Histórico
                </button>
              </div>
            </div>

            {pushActiveTab === 'compose' ? (
              <form onSubmit={handleSendPushNotification} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-xs font-bold text-on-surface opacity-75">Título</label>
                    <input
                      required
                      type="text"
                      value={pushForm.title}
                      onChange={(event) => setPushForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Ex: Saída para o passeio em 30 minutos"
                      className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface opacity-75">Categoria</label>
                    <select
                      value={pushForm.category}
                      onChange={(event) => setPushForm((prev) => ({ ...prev, category: event.target.value as typeof prev.category }))}
                      className="border border-outline-variant rounded-lg p-2.5 text-xs bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    >
                      <option value="general">Informativo</option>
                      <option value="reminder">Lembrete</option>
                      <option value="schedule_change">Alteração de horário</option>
                      <option value="alert">Alerta importante</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface opacity-75">Prioridade</label>
                    <select
                      value={pushForm.priority}
                      onChange={(event) => setPushForm((prev) => ({ ...prev, priority: event.target.value as typeof prev.priority }))}
                      className="border border-outline-variant rounded-lg p-2.5 text-xs bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-xs font-bold text-on-surface opacity-75">Mensagem</label>
                    <textarea
                      required
                      rows={4}
                      value={pushForm.message}
                      onChange={(event) => setPushForm((prev) => ({ ...prev, message: event.target.value }))}
                      placeholder="Mensagem curta que será exibida no app mobile do viajante."
                      className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none"
                    />
                    <span className="text-[10px] text-on-surface opacity-55 text-right">
                      {pushForm.message.length}/180 caracteres recomendados
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-outline-variant overflow-hidden">
                  <div className="bg-surface-container-low px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-on-surface">Destinatários</p>
                      <p className="text-[10px] text-on-surface opacity-65">
                        Escolha todos os viajantes ou marque usuários específicos.
                      </p>
                    </div>
                    <div className="inline-flex rounded-lg bg-white border border-outline-variant p-1 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setPushForm((prev) => ({ ...prev, targetMode: 'all', recipients: [] }))}
                        className={`rounded-md px-3 py-1.5 ${
                          pushForm.targetMode === 'all' ? 'bg-primary text-on-primary' : 'text-on-surface opacity-70'
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setPushForm((prev) => ({ ...prev, targetMode: 'specific' }))}
                        className={`rounded-md px-3 py-1.5 ${
                          pushForm.targetMode === 'specific' ? 'bg-primary text-on-primary' : 'text-on-surface opacity-70'
                        }`}
                      >
                        Específicos
                      </button>
                    </div>
                  </div>

                  {pushForm.targetMode === 'specific' && (
                    <div className="max-h-56 overflow-y-auto custom-scrollbar p-3 space-y-2">
                      {(trip.travelers || []).length > 0 ? (
                        (trip.travelers || []).map((traveler, index) => {
                          const selected = pushForm.recipients.includes(traveler);
                          return (
                            <label
                              key={`${traveler}-${index}`}
                              className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                                selected
                                  ? 'border-primary bg-primary/5'
                                  : 'border-outline-variant hover:bg-surface-container-low'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => togglePushRecipient(traveler)}
                                className="h-4 w-4 accent-primary"
                              />
                              <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-[10px] font-black">
                                {getTravelerInitials(traveler)}
                              </span>
                              <span className="text-xs font-bold text-on-surface">{traveler}</span>
                            </label>
                          );
                        })
                      ) : (
                        <div className="py-8 text-center text-xs text-on-surface opacity-60">
                          Nenhum viajante cadastrado nesta viagem.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-primary mb-2">Prévia do push</p>
                  <div className="rounded-2xl bg-white border border-outline-variant p-4 shadow-sm max-w-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">travel_explore</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-on-surface truncate">
                          {pushForm.title || 'Título da notificação'}
                        </p>
                        <p className="text-[11px] text-on-surface opacity-70 leading-snug mt-0.5">
                          {pushForm.message || 'A mensagem aparecerá aqui como o viajante verá no app.'}
                        </p>
                      </div>
                    </div>
                  </div>
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
                    className="px-5 py-2.5 bg-primary text-on-primary font-bold rounded-lg text-xs hover:opacity-90 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[15px]">send</span>
                    Emitir push
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6">
                {loadingNotifications ? (
                  <div className="py-10 text-center">
                    <span className="material-symbols-outlined animate-spin text-2xl text-primary">sync</span>
                    <p className="text-xs text-on-surface opacity-60 mt-2">Carregando notificações...</p>
                  </div>
                ) : notifications.length > 0 ? (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="rounded-xl border border-outline-variant p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <p className="text-sm font-black text-on-surface">{notification.title}</p>
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase text-primary">
                                {notification.status || 'queued'}
                              </span>
                              {notification.priority === 'high' && (
                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-black uppercase text-red-600">
                                  alta prioridade
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-on-surface opacity-75 leading-relaxed">{notification.message}</p>
                            <p className="text-[10px] text-on-surface opacity-55 mt-2">
                              Para:{' '}
                              {notification.recipients?.length
                                ? notification.recipients.join(', ')
                                : 'todos os viajantes'}
                            </p>
                          </div>
                          <span className="text-[10px] text-on-surface opacity-50 whitespace-nowrap">
                            {notification.createdAt
                              ? new Date(notification.createdAt).toLocaleDateString('pt-BR')
                              : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center border border-dashed border-outline-variant rounded-xl">
                    <span className="material-symbols-outlined text-3xl text-primary opacity-70">notifications_none</span>
                    <p className="text-sm font-bold text-on-surface mt-2">Nenhuma notificação emitida</p>
                    <p className="text-xs text-on-surface opacity-60 mt-1">
                      As notificações enviadas para esta viagem aparecerão aqui.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {isCoverPickerOpen && (
        <div className="fixed inset-0 z-[100] bg-on-background/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[860px] shadow-2xl rounded-xl border border-outline-variant overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-outline-variant flex items-start justify-between gap-4 shrink-0">
              <div>
                <h2 className="font-headline-md text-xl font-bold text-on-surface">Escolher capa da viagem</h2>
                <p className="text-on-surface opacity-70 text-xs mt-1">
                  Esta imagem aparece em destaque no feed do cliente final.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCoverPickerOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors text-on-surface opacity-75"
                title="Fechar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="px-6 pt-4 border-b border-outline-variant shrink-0">
              <div className="flex text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCoverPickerTab('browse')}
                  className={`flex-1 pb-3 border-b-2 transition-colors ${
                    coverPickerTab === 'browse' ? 'border-primary text-primary' : 'border-transparent opacity-60'
                  }`}
                >
                  Biblioteca
                </button>
                <button
                  type="button"
                  onClick={() => setCoverPickerTab('upload')}
                  className={`flex-1 pb-3 border-b-2 transition-colors ${
                    coverPickerTab === 'upload' ? 'border-primary text-primary' : 'border-transparent opacity-60'
                  }`}
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setCoverPickerTab('search')}
                  className={`flex-1 pb-3 border-b-2 transition-colors ${
                    coverPickerTab === 'search' ? 'border-primary text-primary' : 'border-transparent opacity-60'
                  }`}
                >
                  Pixabay
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              {coverPickerTab === 'browse' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3">
                    <select
                      value={selectedFolder || ''}
                      onChange={(e) => setSelectedFolder(e.target.value || null)}
                      className="border border-outline-variant rounded-lg p-2.5 text-xs bg-white focus:ring-1 focus:ring-primary outline-none"
                    >
                      <option value="">Todas as pastas</option>
                      {folders.map((folder) => (
                        <option key={folder} value={folder}>{folder}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Buscar foto na biblioteca..."
                      value={searchPhoto}
                      onChange={(e) => setSearchPhoto(e.target.value)}
                      className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>

                  {filteredPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {filteredPhotos.map((photo) => (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => handleSaveCoverImage(photo.url)}
                          className="group relative aspect-[16/9] rounded-lg overflow-hidden border border-outline-variant bg-surface-container-low text-left"
                          title={photo.name}
                        >
                          <img src={photo.url} alt={photo.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-x-0 bottom-0 bg-black/55 text-white text-[10px] font-bold p-2 truncate">
                            {photo.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-outline-variant rounded-xl p-10 text-center">
                      <span className="material-symbols-outlined text-3xl text-primary opacity-70">photo_library</span>
                      <p className="text-xs font-bold text-on-surface mt-2">Nenhuma foto encontrada na biblioteca.</p>
                      <p className="text-[11px] text-on-surface opacity-60 mt-1">
                        Use a aba Upload para armazenar uma imagem útil na plataforma.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {coverPickerTab === 'upload' && (
                <div className="border-2 border-dashed border-outline-variant rounded-xl p-10 text-center bg-surface-container-low">
                  <span className="material-symbols-outlined text-4xl text-primary">cloud_upload</span>
                  <h3 className="font-headline-sm text-lg font-black text-on-surface mt-3">Enviar imagem da capa</h3>
                  <p className="text-xs text-on-surface opacity-65 mt-1 max-w-md mx-auto">
                    Use imagens horizontais para melhor resultado no feed do cliente.
                  </p>
                  <label className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary text-on-primary px-4 py-2.5 text-xs font-bold cursor-pointer hover:opacity-95">
                    <span className="material-symbols-outlined text-[16px]">upload</span>
                    Selecionar arquivo
                    <input type="file" accept="image/*" className="hidden" onChange={handleCoverFileUpload} />
                  </label>
                </div>
              )}

              {coverPickerTab === 'search' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={coverSearchTerm}
                      onChange={(e) => setCoverSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCoverSearchSubmit(e);
                        }
                      }}
                      placeholder="Ex: Joao Pessoa beach sunset"
                      className="flex-1 border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                    <button
                      type="button"
                      onClick={(e) => handleCoverSearchSubmit(e)}
                      disabled={isCoverSearching}
                      className="px-4 py-2.5 rounded-lg bg-primary text-on-primary text-xs font-bold disabled:opacity-60"
                    >
                      {isCoverSearching ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                  {coverSearchError && (
                    <p className="text-xs font-semibold text-error bg-error/10 rounded-lg p-3">{coverSearchError}</p>
                  )}
                  {coverSearchResults.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {coverSearchResults.map((url) => (
                        <button
                          key={url}
                          type="button"
                          onClick={() => handleSaveCoverImage(url)}
                          className="group relative aspect-[16/9] rounded-lg overflow-hidden border border-outline-variant bg-surface-container-low"
                        >
                          <img src={url} alt="Resultado Pixabay" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-x-0 bottom-0 bg-black/55 text-white text-[10px] font-bold p-2">
                            Usar como capa
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info Card Section */}
      <section className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="pdf-info-card bg-white border border-outline-variant rounded-xl shadow-sm col-span-2 overflow-hidden">
          <div className="relative min-h-[310px] bg-surface-container-low">
            {trip.coverImage ? (
              <img src={trip.coverImage} alt={`Capa de ${trip.name}`} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 border-b border-outline-variant bg-gradient-to-br from-surface-container-low to-white">
                <span className="material-symbols-outlined text-5xl text-primary opacity-75">add_photo_alternate</span>
                <h3 className="font-headline-sm text-xl font-black text-on-surface mt-3">Capa da viagem</h3>
                <p className="text-xs text-on-surface opacity-65 mt-1 max-w-sm">
                  Esta imagem aparece grande no feed do cliente final e ajuda a identificar a trilha rapidamente.
                </p>
              </div>
            )}

            {trip.coverImage && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/15" />
            )}

            <div className="absolute left-5 top-5 right-5 flex items-start justify-between gap-3">
              <div className={`${trip.coverImage ? 'text-white' : 'text-primary'} max-w-md`}>
                <h3 className="font-headline-md text-2xl font-black leading-tight mt-1">{trip.name}</h3>
              </div>
              <button
                onClick={handleOpenTripSettings}
                className="print:hidden h-9 w-9 shrink-0 rounded-full bg-white/90 hover:bg-white text-primary shadow-sm flex items-center justify-center transition-all duration-300 hover:rotate-90 hover:scale-110 hover:shadow-md active:scale-95"
                title="Editar informaÃ§Ãµes da viagem"
              >
                <span className="material-symbols-outlined text-lg">settings</span>
              </button>
            </div>

            <div className="absolute left-5 right-5 bottom-5 flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white/90 text-primary px-3 py-1 text-[10px] font-black shadow-sm">
                  {trip.destinations?.join(', ') || 'Destino'}
                </span>
                <span className="rounded-full bg-white/90 text-on-surface px-3 py-1 text-[10px] font-black shadow-sm">
                  {trip.startDate} a {trip.endDate}
                </span>
              </div>
            </div>
          </div>
          <div className="hidden">
            <div>
              <h3 className="font-bold text-sm text-primary uppercase tracking-wider">Informações da Viagem</h3>
              <p className="text-[11px] text-on-surface opacity-70 mt-0.5">Detalhes gerais do planejamento</p>
            </div>
            <button
              onClick={handleOpenTripSettings}
              className="print:hidden p-2 hover:bg-surface-container-low rounded-full transition-colors text-on-surface active:scale-95 animate-pulse-subtle"
              title="Editar informações da viagem"
            >
              <span className="material-symbols-outlined text-lg">settings</span>
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-xs p-6">
            <div className="border-b border-outline-variant/40 pb-2">
              <span className="font-semibold text-[10px] uppercase text-on-surface opacity-60">Cliente / Viajante</span>
              <p className="font-bold text-on-surface mt-0.5">{trip.clientName}</p>
            </div>
            <div className="border-b border-outline-variant/40 pb-2">
              <span className="font-semibold text-[10px] uppercase text-on-surface opacity-60">Status da Trip</span>
              <div className="mt-0.5">
                <span className="px-2 py-0.5 bg-status-active text-success border border-success/20 font-bold rounded text-[9px] uppercase inline-block">
                  {trip.status}
                </span>
              </div>
            </div>
            <div className="border-b border-outline-variant/40 pb-2">
              <span className="font-semibold text-[10px] uppercase text-on-surface opacity-60">Origem</span>
              <p className="font-medium text-on-surface mt-0.5">{trip.origin || 'Não informada'}</p>
            </div>
            <div className="border-b border-outline-variant/40 pb-2">
              <span className="font-semibold text-[10px] uppercase text-on-surface opacity-60">Destinos</span>
              <p className="font-medium text-on-surface mt-0.5">{trip.destinations?.join(', ') || 'Não informados'}</p>
            </div>
            <div className="border-b border-outline-variant/40 pb-2">
              <span className="font-semibold text-[10px] uppercase text-on-surface opacity-60">Período</span>
              <p className="font-medium text-on-surface mt-0.5">{trip.startDate} a {trip.endDate}</p>
            </div>
            <div className="border-b border-outline-variant/40 pb-2">
              <span className="font-semibold text-[10px] uppercase text-on-surface opacity-60">Orçamento</span>
              <p className="font-medium text-on-surface mt-0.5">
                {trip.budget ? `R$ ${trip.budget.toLocaleString('pt-BR')}` : 'Não informado'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 col-span-1">
          {/* Travelers Card */}
          <div className="pdf-info-card bg-white border border-outline-variant p-6 rounded-xl shadow-sm flex flex-col justify-between min-h-[180px]">
            <div>
              <h3 className="font-bold text-sm text-primary uppercase tracking-wider">Viajantes</h3>
              <p className="text-[11px] text-on-surface opacity-70 mt-0.5">Membros inclusos no roteiro</p>
              
              <div className="flex flex-wrap gap-2 mt-4">
                <div className="flex -space-x-2">
                  {(trip.travelers || []).slice(0, 5).map((t, idx) => (
                    <div
                      key={`${t}-${idx}`}
                      className="w-8 h-8 rounded-full border-2 border-white bg-primary text-white flex items-center justify-center text-[10px] font-bold shadow-sm"
                      title={t}
                    >
                      {t}
                    </div>
                  ))}
                  {(trip.travelers || []).length > 5 && (
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-gray text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                      +{(trip.travelers || []).length - 5}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setIsTravelerModalOpen(true)}
              className="print:hidden w-full mt-4 flex items-center justify-center gap-1.5 px-4 py-2 border border-primary text-primary rounded-lg text-xs font-bold hover:bg-primary-container-alt transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              <span>Gerenciar Viajantes</span>
            </button>
          </div>

          {/* Documents Card */}
          <div className="print:hidden bg-white border border-outline-variant p-6 rounded-xl shadow-sm flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-sm text-primary uppercase tracking-wider">Documentos da Viagem</h3>
                  <p className="text-[11px] text-on-surface opacity-70 mt-0.5">Anexos para o viajante acessar</p>
                </div>
                <label 
                  htmlFor="doc-upload-input"
                  className={`p-2 hover:bg-primary hover:text-on-primary rounded-full transition-all duration-300 text-primary active:scale-95 cursor-pointer flex items-center justify-center hover:rotate-90 hover:scale-110 hover:shadow-md ${uploadingDoc ? 'animate-spin' : 'animate-pulse-subtle'}`}
                  title="Anexar documento"
                >
                  <span className="material-symbols-outlined text-lg">
                    {uploadingDoc ? 'sync' : 'add_circle'}
                  </span>
                </label>
                <input
                  id="doc-upload-input"
                  type="file"
                  className="hidden"
                  onChange={handleDocumentFileChange}
                  disabled={uploadingDoc}
                />
              </div>

              {/* Documents List */}
              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {trip.documents && trip.documents.length > 0 ? (
                  trip.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between gap-3 p-2 bg-surface-container-low hover:bg-surface-container rounded-lg border border-outline-variant/30 transition-colors">
                      <a 
                        href={doc.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 min-w-0 flex-1 hover:underline text-left text-xs font-semibold text-on-surface"
                      >
                        <span className="material-symbols-outlined text-base text-primary/70 shrink-0">
                          {doc.name.toLowerCase().endsWith('.pdf') ? 'picture_as_pdf' : 'description'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs text-on-surface" title={doc.name}>
                            {doc.name}
                          </p>
                          <p className="text-[9px] text-on-surface opacity-50">
                            {(doc.size / 1024).toFixed(0)} KB • {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('pt-BR') : ''}
                          </p>
                        </div>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDocumentDelete(doc.id)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="Remover documento"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center border border-dashed border-outline-variant/60 rounded-lg">
                    <span className="material-symbols-outlined text-2xl text-primary opacity-60">folder_open</span>
                    <p className="text-[10px] text-on-surface opacity-60 mt-1">Nenhum documento anexado.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-outline-variant/40 flex items-center justify-between">
              <span className="text-[9px] text-on-surface opacity-50">
                {trip.documents?.length || 0} documento(s)
              </span>
              <label 
                htmlFor="doc-upload-btn"
                className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline cursor-pointer select-none"
              >
                <span className="material-symbols-outlined text-[12px]">cloud_upload</span>
                Adicionar Arquivo
              </label>
              <input
                id="doc-upload-btn"
                type="file"
                className="hidden"
                onChange={handleDocumentFileChange}
                disabled={uploadingDoc}
              />
            </div>
          </div>
        </div>
      </section>
      {/* TRIP SETTINGS MODAL */}
      {isTripSettingsModalOpen && (
        <div className="fixed inset-0 z-[100] bg-on-background/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[560px] max-h-[90vh] shadow-2xl rounded-xl border border-outline-variant overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-outline-variant flex items-start justify-between gap-4 shrink-0">
              <div>
                <h2 className="font-headline-md text-xl font-bold text-on-surface">
                  Configurações da Viagem
                </h2>
                <p className="text-on-surface opacity-70 text-xs mt-1">
                  Atualize as informações gerais e configurações do itinerário.
                </p>
              </div>
              <button
                onClick={() => setIsTripSettingsModalOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors text-on-surface opacity-75"
                title="Fechar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveTripSettings} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar text-left">
              <div className="rounded-xl border border-outline-variant overflow-hidden">
                <div className="relative h-48 bg-surface-container-low">
                  {tripSettingsForm.coverImage ? (
                    <img src={tripSettingsForm.coverImage} alt="Capa da viagem" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-5">
                      <span className="material-symbols-outlined text-4xl text-primary opacity-70">add_photo_alternate</span>
                      <p className="text-sm font-black text-on-surface mt-2">Capa da viagem</p>
                      <p className="text-[11px] text-on-surface opacity-60 mt-1">Imagem principal do feed do cliente final.</p>
                    </div>
                  )}
                  {tripSettingsForm.coverImage && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  )}
                  {tripSettingsForm.coverImage && (
                    <button
                      type="button"
                      onClick={() => handleSaveCoverImage('')}
                      className="absolute right-3 top-3 h-8 w-8 rounded-full bg-white/95 text-red-600 shadow-sm flex items-center justify-center hover:bg-white"
                      title="Remover capa"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  )}
                </div>

                <div className="p-4 space-y-4">
                  <div className="flex text-xs font-bold border-b border-outline-variant">
                    <button
                      type="button"
                      onClick={() => setCoverPickerTab('browse')}
                      className={`flex-1 pb-2 border-b-2 transition-colors ${
                        coverPickerTab === 'browse' ? 'border-primary text-primary' : 'border-transparent opacity-60'
                      }`}
                    >
                      Biblioteca
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverPickerTab('upload')}
                      className={`flex-1 pb-2 border-b-2 transition-colors ${
                        coverPickerTab === 'upload' ? 'border-primary text-primary' : 'border-transparent opacity-60'
                      }`}
                    >
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverPickerTab('search')}
                      className={`flex-1 pb-2 border-b-2 transition-colors ${
                        coverPickerTab === 'search' ? 'border-primary text-primary' : 'border-transparent opacity-60'
                      }`}
                    >
                      Pixabay
                    </button>
                  </div>

                  {coverPickerTab === 'browse' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2">
                        <select
                          value={selectedFolder || ''}
                          onChange={(e) => setSelectedFolder(e.target.value || null)}
                          className="border border-outline-variant rounded-lg p-2.5 text-xs bg-white focus:ring-1 focus:ring-primary outline-none"
                        >
                          <option value="">Todas as pastas</option>
                          {folders.map((folder) => (
                            <option key={folder} value={folder}>{folder}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Buscar foto na biblioteca..."
                          value={searchPhoto}
                          onChange={(e) => setSearchPhoto(e.target.value)}
                          className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                        {filteredPhotos.map((photo) => (
                          <button
                            key={photo.id}
                            type="button"
                            onClick={() => handleSaveCoverImage(photo.url)}
                            className="relative aspect-[16/9] rounded-lg overflow-hidden border border-outline-variant bg-surface-container-low"
                            title={photo.name}
                          >
                            <img src={photo.url} alt={photo.name} className="h-full w-full object-cover" />
                          </button>
                        ))}
                        {filteredPhotos.length === 0 && (
                          <div className="col-span-3 rounded-lg border border-dashed border-outline-variant p-4 text-center text-[11px] text-on-surface opacity-60">
                            Nenhuma foto encontrada na biblioteca.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {coverPickerTab === 'upload' && (
                    <div className="rounded-lg border border-dashed border-outline-variant p-5 text-center bg-surface-container-low">
                      <label className="inline-flex items-center gap-2 rounded-lg bg-primary text-on-primary px-4 py-2.5 text-xs font-bold cursor-pointer hover:opacity-95">
                        <span className="material-symbols-outlined text-[16px]">upload</span>
                        Fazer upload da capa
                        <input type="file" accept="image/*" className="hidden" onChange={handleCoverFileUpload} />
                      </label>
                    </div>
                  )}

                  {coverPickerTab === 'search' && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={coverSearchTerm}
                          onChange={(e) => setCoverSearchTerm(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCoverSearchSubmit(e);
                            }
                          }}
                          placeholder="Ex: Joao Pessoa beach sunset"
                          className="flex-1 border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                        />
                        <button
                          type="button"
                          onClick={(e) => handleCoverSearchSubmit(e)}
                          disabled={isCoverSearching}
                          className="px-4 py-2.5 rounded-lg bg-primary text-on-primary text-xs font-bold disabled:opacity-60"
                        >
                          {isCoverSearching ? 'Buscando...' : 'Buscar'}
                        </button>
                      </div>
                      {coverSearchError && <p className="text-xs font-semibold text-error">{coverSearchError}</p>}
                      <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                        {coverSearchResults.map((url) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() => handleSaveCoverImage(url)}
                            className="relative aspect-[16/9] rounded-lg overflow-hidden border border-outline-variant bg-surface-container-low"
                          >
                            <img src={url} alt="Resultado Pixabay" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs font-bold text-on-surface opacity-75">Título da Viagem</label>
                  <input
                    required
                    type="text"
                    value={tripSettingsForm.name}
                    onChange={(e) => setTripSettingsForm(prev => ({ ...prev, name: e.target.value }))}
                    className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface opacity-75">Cliente Principal</label>
                  <input
                    required
                    type="text"
                    value={tripSettingsForm.clientName}
                    onChange={(e) => setTripSettingsForm(prev => ({ ...prev, clientName: e.target.value }))}
                    className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface opacity-75">Origem</label>
                  <input
                    type="text"
                    value={tripSettingsForm.origin}
                    onChange={(e) => setTripSettingsForm(prev => ({ ...prev, origin: e.target.value }))}
                    placeholder="Ex: São Paulo (GRU)"
                    className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-on-surface opacity-75">Destinos da Viagem</label>
                    <button
                      type="button"
                      onClick={() => setTripSettingsForm(prev => ({ ...prev, destinations: [...prev.destinations, ''] }))}
                      className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[12px]">add</span>
                      Adicionar Destino
                    </button>
                  </div>

                  <div className="space-y-2 pr-1">
                    {tripSettingsForm.destinations.map((dest, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <SearchableCitySelect
                          value={dest}
                          onChange={(val) => {
                            setTripSettingsForm(prev => {
                              const next = [...prev.destinations];
                              next[idx] = val;
                              return { ...prev, destinations: next };
                            });
                          }}
                          placeholder="Pesquise o destino..."
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setTripSettingsForm(prev => {
                              const next = prev.destinations.filter((_, i) => i !== idx);
                              return { ...prev, destinations: next };
                            });
                          }}
                          disabled={tripSettingsForm.destinations.length <= 1}
                          className="p-2.5 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Remover destino"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface opacity-75">Data de Partida</label>
                  <input
                    required
                    type="date"
                    value={tripSettingsForm.startDate}
                    onChange={(e) => setTripSettingsForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface opacity-75">Data de Retorno</label>
                  <input
                    required
                    type="date"
                    value={tripSettingsForm.endDate}
                    onChange={(e) => setTripSettingsForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface opacity-75">Orçamento (BRL)</label>
                  <input
                    type="number"
                    value={tripSettingsForm.budget}
                    onChange={(e) => setTripSettingsForm(prev => ({ ...prev, budget: Number(e.target.value) }))}
                    className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface opacity-75">Status da Trip</label>
                  <select
                    value={tripSettingsForm.status}
                    onChange={(e) => setTripSettingsForm(prev => ({ ...prev, status: e.target.value as Trip['status'] }))}
                    className="border border-outline-variant rounded-lg p-2.5 text-xs bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Confirmado">Confirmado</option>
                    <option value="Publicado">Publicado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsTripSettingsModalOpen(false)}
                  className="px-4 py-2.5 border border-outline rounded-lg text-xs font-semibold hover:bg-surface-container"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-on-primary font-bold rounded-lg text-xs hover:opacity-90"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* Itinerary Trail Path */}
      <div className="pdf-itinerary relative">
        {/* Days loop */}
        {getDays().map((dayNum) => {
          const dayItems = items.filter((i) => i.day === dayNum);

          return (
            <div key={dayNum} className="scroll-reveal journey-node mb-14">
              <div className="flex items-center justify-between mb-6 pl-1">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center text-sm font-black shadow-md ring-4 ring-primary/10">
                    {dayNum}
                  </div>
                  <h3 className="font-headline-md text-lg font-bold text-on-surface">Dia {dayNum} do Roteiro</h3>
                </div>
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

              <div className="relative flex flex-col gap-0">
                {dayItems.map((item, index) => {
                  const isEven = index % 2 === 0;
                  const connectorIcon = getTrailConnectorIcon(item);
                  const connectorLabel = getTrailDistanceLabel(item);
                  const itemIcon = item.customSymbol || (ADD_OPTIONS.find(o => o.type === item.type)?.defaultSymbol || 'explore');
                  const theme = getTrailTheme(item.type);
                  const uberRideUrl = buildUberRideUrl(item);

                  return (
                  <div key={item.id} className="scroll-reveal pdf-trail-grid relative grid grid-cols-[76px_minmax(0,1fr)] sm:grid-cols-[92px_minmax(0,1fr)] gap-3 sm:gap-5 min-h-[206px]">
                    <div className="relative flex flex-col items-center">
                      {index > 0 && (
                        <div className="pdf-connector absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-primary/65">
                          <span className="w-2 h-2 rounded-full bg-slate-300" />
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          <div className="h-8 w-8 rounded-full bg-white border border-outline-variant shadow-sm flex items-center justify-center">
                            <span className="material-symbols-outlined text-[18px] text-primary">
                              {connectorIcon}
                            </span>
                          </div>
                          {connectorLabel && (
                            <span
                              className="absolute left-[46px] top-[38px] z-20 max-w-[72px] truncate text-[9px] font-black bg-white border border-outline-variant rounded-full px-2 py-0.5 shadow-sm whitespace-nowrap"
                              title={connectorLabel}
                            >
                              {connectorLabel}
                            </span>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleStartEditItem(item)}
                        disabled={isPreviewMode}
                        className={`pdf-node-button mt-6 w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(15,23,42,0.12)] z-10 transition-all border-2 ring-4 ${theme.node} ${!isPreviewMode ? 'hover:scale-110 cursor-pointer' : ''}`}
                        title={`Tipo: ${getTypeLabel(item.type)}`}
                      >
                        <span className="material-symbols-outlined text-[26px]">{itemIcon}</span>
                      </button>

                      {index < dayItems.length - 1 && (
                        <div className="pdf-connector flex-1 min-h-16 py-3 flex flex-col items-center justify-evenly">
                          <span className={`w-2 h-2 rounded-full ${theme.rail} opacity-70`} />
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          <span className="w-2 h-2 rounded-full bg-slate-300" />
                        </div>
                      )}
                    </div>

                    <div
                      className={`card-hover relative border rounded-xl overflow-hidden transition-all hover:border-primary flex shadow-sm group mb-8 ${
                        theme.card
                      } ${
                        isEven ? 'sm:mr-12' : 'sm:ml-10'
                      }`}
                    >
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${theme.rail}`} />
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
                      <div className="pdf-card-media w-1/3 min-h-[172px] relative hidden sm:block">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/5" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="pdf-card-body flex-1 p-6 pl-7 flex flex-col justify-between">
                      <div>
                        <div className={`pdf-item-label inline-flex items-center gap-2 rounded-full px-2.5 py-1 mb-3 ${theme.label}`}>
                          <span className="material-symbols-outlined text-[16px]">
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
                          <p className="whitespace-pre-line text-xs text-on-surface opacity-80 leading-relaxed max-w-xl">
                            {item.details}
                          </p>
                        ) : !isPreviewMode ? (
                          <p className="text-xs text-on-surface opacity-50 italic">
                            Sem descrição cadastrada. Clique no lápis para adicionar!
                          </p>
                        ) : null}

                        {uberRideUrl && (
                          <div className="pdf-digital-only mt-4 flex flex-wrap items-center gap-2">
                            <a
                              href={uberRideUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-full bg-black px-3.5 py-2 text-[11px] font-black text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-black/20"
                              title="Abrir rota no app da Uber"
                            >
                              <span className="material-symbols-outlined text-[16px]">local_taxi</span>
                              <span>Abrir no Uber</span>
                            </a>
                            <span className="text-[10px] font-semibold text-on-surface opacity-55">
                              Origem: local atual
                            </span>
                          </div>
                        )}

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
                  );
                })}

                {dayItems.length === 0 && (
                  <p className="text-xs text-on-surface opacity-60 italic ml-4">
                    Nenhum item adicionado para este dia.
                  </p>
                )}
              </div>

              {/* Add Button Connector to specific day */}
              {!isPreviewMode && (
                <div className="pdf-add-day flex justify-start ml-20 mt-2 mb-8">
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
