'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AMERICA_DESTINATIONS } from '../../../../lib/destinations/america-destinations';
import {
  canUseLocalTripFallback,
  isProductionPersistenceError,
  upsertLocalTrip,
} from '../../../../lib/trip-local-store';

// Predefined list of searchable cities and travel regions
const CITIES = AMERICA_DESTINATIONS;

const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

interface DestinationEntry {
  city: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  allTravelers: boolean;
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

interface TripDocument {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
  size: number;
}

interface PendingDocument {
  id: string;
  file: File;
}

type WizardStep = 'general' | 'logistics' | 'ai' | 'review';

const LEGACY_TRIP_DRAFT_STORAGE_KEY = 'rumo:new-trip-draft:v1';
const WIZARD_STEPS: Array<{ id: WizardStep; label: string; description: string; icon: string }> = [
  { id: 'general', label: 'Essencial', description: 'Datas, destinos e viajantes', icon: 'travel_explore' },
  { id: 'logistics', label: 'Logística', description: 'Reservas e documentos', icon: 'luggage' },
  { id: 'ai', label: 'Preferências', description: 'Ritmo e estilo do roteiro', icon: 'auto_awesome' },
  { id: 'review', label: 'Revisão', description: 'Confira antes de criar', icon: 'task_alt' },
];

type TransportationType =
  | 'voo'
  | 'barco'
  | 'onibus'
  | 'aluguel_carro'
  | 'balsa'
  | 'carro_privativo'
  | 'shuttle'
  | 'taxi'
  | 'trem'
  | 'bonde';

interface TransportationEntry {
  id: string;
  type: TransportationType;
  operator: string;
  number: string;
  date: string;
  details: string;
  bookingReference: string;
  seat: string;
  baggage: string;
}

interface AccommodationEntry {
  id: string;
  destinationCity: string;
  name: string;
  address?: string;
  checkIn: string;
  checkOut: string;
  placeId?: string;
  photos?: string[];
  roomCategory?: string;
  mealPlan?: string;
  reservationNotes?: string;
}

interface ActivityEntry { id: string; name: string; date: string; time: string; address: string; category: string; voucher: string; supplier: string; ticketsIncluded: boolean; placeId?: string; photos?: string[]; }
interface InsuranceEntry { id: string; type: 'insurance' | 'visa'; provider: string; reference: string; validity: string; details: string; }

interface HotelSearchResult {
  id: string;
  name: string;
  address: string;
  placeId: string;
  photos: string[];
  categories?: string[];
}

interface NewTripPayload {
  id: string;
  createdDate: string;
  name: string;
  destinations: string[];
  destinationsDetail: DestinationEntry[];
  startDate: string;
  endDate: string;
  travelers: string[];
  status: 'Rascunho' | 'Pendente';
  clientName: string;
  itinerary: any[];
  budget: number;
  preferences: string;
  profile: string;
  origin: string;
  coverImage: string;
  documents?: TripDocument[];
  transportation?: TransportationEntry[];
  accommodations?: AccommodationEntry[];
  activities?: ActivityEntry[];
  insuranceAndVisas?: InsuranceEntry[];
  wizardDraft?: Record<string, unknown>;
}

const TRANSPORT_OPTIONS: Array<{
  type: TransportationType;
  label: string;
  icon: string;
  emoji: string;
}> = [
  { type: 'voo', label: 'Voo', icon: 'flight', emoji: '✈️' },
  { type: 'barco', label: 'Barco', icon: 'directions_boat', emoji: '🚢' },
  { type: 'onibus', label: 'Onibus', icon: 'directions_bus', emoji: '🚌' },
  { type: 'aluguel_carro', label: 'Aluguel de Carro', icon: 'car_rental', emoji: '🚗' },
  { type: 'balsa', label: 'Balsa', icon: 'sailing', emoji: '⛴️' },
  { type: 'carro_privativo', label: 'Carro privativo', icon: 'local_taxi', emoji: '🚘' },
  { type: 'shuttle', label: 'Shuttle', icon: 'airport_shuttle', emoji: '🚐' },
  { type: 'taxi', label: 'Taxi', icon: 'local_taxi', emoji: '🚕' },
  { type: 'trem', label: 'Trem', icon: 'train', emoji: '🚆' },
  { type: 'bonde', label: 'Bonde', icon: 'tram', emoji: '🚋' },
];

interface CalendarPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRange: (start: Date, end: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  initialStart?: Date;
  initialEnd?: Date;
  blockedRanges?: { start: string; end: string }[];
}

// Custom Client-Side Date Range Picker Component
const CalendarPicker: React.FC<CalendarPickerProps> = ({
  isOpen,
  onClose,
  onSelectRange,
  minDate,
  maxDate,
  initialStart,
  initialEnd,
  blockedRanges,
}) => {
  const calendarRef = useRef<HTMLDivElement>(null);

  const [currentDate, setCurrentDate] = useState(() => {
    if (initialStart) return new Date(initialStart);
    if (minDate) return new Date(minDate);
    return new Date();
  });

  const [start, setStart] = useState<Date | null>(initialStart || null);
  const [end, setEnd] = useState<Date | null>(initialEnd || null);

  useEffect(() => {
    if (initialStart) setStart(initialStart);
    if (initialEnd) setEnd(initialEnd);
  }, [initialStart, initialEnd]);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current) {
        const container = calendarRef.current.closest('.relative') || calendarRef.current;
        if (!container.contains(event.target as Node)) {
          onClose();
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Get total days in month
  const totalDays = new Date(year, month + 1, 0).getDate();
  // Get starting weekday (0-6)
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Portuguese month names
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const days = [];
  // Add empty slots for offset
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  // Add actual days
  for (let d = 1; d <= totalDays; d++) {
    days.push(new Date(year, month, d));
  }

  const isDisabled = (date: Date) => {
    // Zero out hours to compare purely by calendar day
    const targetTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    if (minDate) {
      const minTime = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime();
      if (targetTime < minTime) return true;
    }
    if (maxDate) {
      const maxTime = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()).getTime();
      if (targetTime > maxTime) return true;
    }
    if (blockedRanges) {
      for (const range of blockedRanges) {
        if (range.start && range.end) {
          const startTime = new Date(range.start + 'T00:00:00').getTime();
          const endTime = new Date(range.end + 'T23:59:59').getTime();
          if (targetTime >= startTime && targetTime <= endTime) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const handleDayClick = (date: Date) => {
    // Reset range or select start/end
    if (!start || (start && end)) {
      setStart(date);
      setEnd(null);
    } else {
      if (date < start) {
        setStart(date);
      } else {
        // Check if there are any blocked/disabled days in between
        let hasBlocked = false;
        let current = new Date(start);
        while (current <= date) {
          if (isDisabled(current)) {
            hasBlocked = true;
            break;
          }
          current.setDate(current.getDate() + 1);
        }

        if (hasBlocked) {
          // Reset start to clicked date
          setStart(date);
          setEnd(null);
        } else {
          setEnd(date);
        }
      }
    }
  };

  const isSelected = (date: Date) => {
    if (start && date.getTime() === start.getTime()) return true;
    if (end && date.getTime() === end.getTime()) return true;
    return false;
  };

  const isInRange = (date: Date) => {
    if (start && end && date > start && date < end) return true;
    return false;
  };

  const weekdaysShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div ref={calendarRef} className="absolute z-[120] mt-2 bg-white rounded-xl shadow-2xl border border-outline-variant p-4 w-72 text-on-surface">
      <div className="flex justify-between items-center mb-3">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center font-bold text-xs"
        >
          &lt;
        </button>
        <span className="text-xs font-bold text-primary uppercase">
          {monthNames[month]} {year}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center font-bold text-xs"
        >
          &gt;
        </button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-1 text-[10px] text-center font-bold opacity-60 uppercase mb-2">
        {weekdaysShort.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1 text-xs">
        {days.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          const disabled = isDisabled(day);
          const selected = isSelected(day);
          const inRange = isInRange(day);

          return (
            <button
              type="button"
              key={day.toISOString()}
              disabled={disabled}
              onClick={() => handleDayClick(day)}
              className={`h-8 w-8 flex items-center justify-center rounded-full transition-all relative font-medium ${
                disabled
                  ? 'opacity-20 cursor-not-allowed'
                  : selected
                  ? 'bg-black text-white font-bold scale-105 z-10'
                  : inRange
                  ? 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold rounded-none'
                  : 'hover:bg-surface-container-low text-on-surface'
              }`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-outline-variant">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-[10px] border border-outline rounded-lg hover:bg-surface-container text-on-surface font-bold"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!start || !end}
          onClick={() => {
            if (start && end) {
              onSelectRange(start, end);
              onClose();
            }
          }}
          className="px-3.5 py-1.5 text-[10px] bg-primary text-on-primary rounded-lg hover:opacity-90 font-bold disabled:opacity-50"
        >
          Confirmar
        </button>
      </div>
    </div>
  );
};

// Searchable City Auto-Suggestion Selector Component
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

export default function NewTripPage() {
  const router = useRouter();
  const browserFallbackEnabled = canUseLocalTripFallback();
  const [loading, setLoading] = useState(false);
  const [enrichingPreferences, setEnrichingPreferences] = useState(false);
  const [enrichedSuggestion, setEnrichedSuggestion] = useState('');
  const [enrichmentError, setEnrichmentError] = useState('');
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [activeLogisticsTab, setActiveLogisticsTab] = useState<'transport' | 'hotel' | 'activities' | 'insurance'>('transport');
  const [wizardStep, setWizardStep] = useState<WizardStep>('general');
  const [draftResumed, setDraftResumed] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [draftTripId, setDraftTripId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<WizardStep[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    origin: 'São Paulo (BR)',
    startDate: '',
    endDate: '',
    travelers: 1,
    travelerNames: '',
    profile: 'lazer',
    budget: '',
    preferences: '',
    coverImage: '',
  });

  const [destinations, setDestinations] = useState<DestinationEntry[]>([
    { city: '', startDate: '', endDate: '', allTravelers: true }
  ]);

  const [showGlobalCalendar, setShowGlobalCalendar] = useState(false);
  const [activeDestCalendarIndex, setActiveDestCalendarIndex] = useState<number | null>(null);
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  const [transportation, setTransportation] = useState<TransportationEntry[]>([]);
  const [transportDraft, setTransportDraft] = useState<TransportationEntry>({
    id: '',
    type: 'voo',
    operator: '',
    number: '',
    date: '',
    details: '',
    bookingReference: '',
    seat: '',
    baggage: '',
  });
  const [accommodations, setAccommodations] = useState<AccommodationEntry[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [activityDraft, setActivityDraft] = useState<ActivityEntry>({ id: '', name: '', date: '', time: '', address: '', category: 'passeio', voucher: '', supplier: '', ticketsIncluded: false, placeId: '', photos: [] });
  const [activitySearchTerm, setActivitySearchTerm] = useState('');
  const [activitySearchResults, setActivitySearchResults] = useState<HotelSearchResult[]>([]);
  const [activitySearchLoading, setActivitySearchLoading] = useState(false);
  const [activitySearchError, setActivitySearchError] = useState('');
  const [insuranceAndVisas, setInsuranceAndVisas] = useState<InsuranceEntry[]>([]);
  const [insuranceDraft, setInsuranceDraft] = useState<Omit<InsuranceEntry, 'id'>>({ type: 'insurance', provider: '', reference: '', validity: '', details: '' });
  const [accommodationDraft, setAccommodationDraft] = useState<AccommodationEntry>({
    id: '',
    destinationCity: '',
    name: '',
    address: '',
    checkIn: '',
    checkOut: '',
    placeId: '',
    photos: [],
    roomCategory: '',
    mealPlan: '',
    reservationNotes: '',
  });
  const [hotelSearchTerm, setHotelSearchTerm] = useState('');
  const [hotelSearchResults, setHotelSearchResults] = useState<HotelSearchResult[]>([]);
  const [hotelSearchLoading, setHotelSearchLoading] = useState(false);
  const [hotelSearchError, setHotelSearchError] = useState('');
  const [isManualAccommodation, setIsManualAccommodation] = useState(false);
  const [libraryPhotos, setLibraryPhotos] = useState<LibraryPhoto[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchPhoto, setSearchPhoto] = useState('');
  const [coverPickerTab, setCoverPickerTab] = useState<'browse' | 'upload' | 'search'>('browse');
  const [coverSearchTerm, setCoverSearchTerm] = useState('');
  const [coverSearchResults, setCoverSearchResults] = useState<string[]>([]);
  const [isCoverSearching, setIsCoverSearching] = useState(false);
  const [coverSearchError, setCoverSearchError] = useState('');

  const buildDraftPayload = useCallback(() => ({
    version: 1,
    updatedAt: new Date().toISOString(),
    wizardStep,
    formData: {
      ...formData,
      // Base64 uploads can exceed the browser storage quota. Remote/library images are safe to retain.
      coverImage: formData.coverImage.startsWith('data:') ? '' : formData.coverImage,
    },
    destinations,
    transportation,
    accommodations,
    activities,
    insuranceAndVisas,
    activeLogisticsTab,
    completedSteps,
  }), [wizardStep, formData, destinations, transportation, accommodations, activities, insuranceAndVisas, activeLogisticsTab, completedSteps]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        localStorage.removeItem(LEGACY_TRIP_DRAFT_STORAGE_KEY);
        const draftId = new URLSearchParams(window.location.search).get('draft');
        const templateId = new URLSearchParams(window.location.search).get('template');
        if (draftId) {
          const response = await fetch(`/api/trips/${encodeURIComponent(draftId)}`, { cache: 'no-store' });
          if (!response.ok) throw new Error('Rascunho não encontrado.');
          const trip = await response.json();
          if (trip.status !== 'Rascunho') throw new Error('Esta viagem não é mais um rascunho.');
          const draft = trip.wizardDraft || {};
          const persistedFormData = {
            title: String(trip.name || ''),
            origin: String(trip.origin || ''),
            startDate: String(trip.startDate || ''),
            endDate: String(trip.endDate || ''),
            travelers: Math.max(1, Array.isArray(trip.travelers) ? trip.travelers.length : Number(trip.travelers) || 1),
            travelerNames: String(trip.clientName || ''),
            profile: String(trip.profile || 'lazer'),
            budget: trip.budget == null ? '' : String(trip.budget),
            preferences: String(trip.preferences || ''),
            coverImage: String(trip.coverImage || ''),
          };
          setFormData((current) => ({ ...current, ...persistedFormData, ...(draft.formData || {}) }));

          const restoredDestinations = Array.isArray(draft.destinations) && draft.destinations.length
            ? draft.destinations
            : Array.isArray(trip.destinationsDetail) && trip.destinationsDetail.length
              ? trip.destinationsDetail
              : Array.isArray(trip.destinations) && trip.destinations.length
                ? trip.destinations.map((city: string) => ({
                    city,
                    startDate: String(trip.startDate || ''),
                    endDate: String(trip.endDate || ''),
                    allTravelers: true,
                  }))
                : [];
          if (restoredDestinations.length) setDestinations(restoredDestinations);
          setTransportation(Array.isArray(draft.transportation) ? draft.transportation : Array.isArray(trip.transportation) ? trip.transportation : []);
          setAccommodations(Array.isArray(draft.accommodations) ? draft.accommodations : Array.isArray(trip.accommodations) ? trip.accommodations : []);
          setActivities(Array.isArray(draft.activities) ? draft.activities : Array.isArray(trip.activities) ? trip.activities : []);
          setInsuranceAndVisas(Array.isArray(draft.insuranceAndVisas) ? draft.insuranceAndVisas : Array.isArray(trip.insuranceAndVisas) ? trip.insuranceAndVisas : []);
          if (WIZARD_STEPS.some((step) => step.id === draft.wizardStep)) setWizardStep(draft.wizardStep);
          if (['transport', 'hotel', 'activities', 'insurance'].includes(draft.activeLogisticsTab)) setActiveLogisticsTab(draft.activeLogisticsTab);
          if (Array.isArray(draft.completedSteps)) {
            setCompletedSteps(draft.completedSteps.filter((id: string) => WIZARD_STEPS.some((step) => step.id === id)));
          }
          setDraftResumed(true);
          setDraftTripId(trip.id);
          setDraftSavedAt(draft.updatedAt ? new Date(draft.updatedAt) : new Date());
          if (trip.templateId) setSelectedTemplateId(String(trip.templateId));
        } else if (templateId) {
          const response = await fetch(`/api/library/templates/${encodeURIComponent(templateId)}`, { cache: 'no-store' });
          if (!response.ok) throw new Error('Modelo de roteiro não encontrado.');
          const template = await response.json();
          setSelectedTemplateId(template.id);
          setSelectedTemplateName(template.name);
          setFormData((current) => ({
            ...current,
            title: current.title || `${template.name} — nova viagem`,
            profile: template.traveler_profile === 'business' ? 'negocios' : template.traveler_profile === 'couple' ? 'lua_de_mel' : current.profile,
            preferences: [current.preferences, `Usar o modelo “${template.name}” como estrutura principal. Ritmo: ${template.pace}.`].filter(Boolean).join('\n'),
          }));
          if (template.destination) setDestinations([{ city: [template.destination, template.country].filter(Boolean).join(' (' ) + (template.country ? ')' : ''), startDate: '', endDate: '', allTravelers: true }]);
        }
      } catch (error) {
        console.error('Rascunho de viagem inválido.', error);
        alert(error instanceof Error ? error.message : 'Não foi possível abrir o rascunho.');
        router.replace('/trips');
      } finally {
        // A tela só restaura rascunhos identificados explicitamente pela URL.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    const fetchLibraryData = async () => {
      try {
        const response = await fetch('/api/library');
        if (response.ok) {
          const data = await response.json();
          setLibraryPhotos(data.photos || []);
          setFolders(data.folders || []);
          if (data.folders?.length) setSelectedFolder(data.folders[0]);
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchLibraryData();
  }, []);

  useEffect(() => {
    const tripDestinations = destinations.filter((destination) => destination.city.trim());
    if (!accommodationDraft.destinationCity && tripDestinations.length === 1) {
      resetAccommodationDraft(tripDestinations[0].city);
    }
  }, [destinations, accommodationDraft.destinationCity]);

  useEffect(() => {
    const term = hotelSearchTerm.trim();
    if (isManualAccommodation || !accommodationDraft.destinationCity || term.length < 3) {
      setHotelSearchResults([]);
      setHotelSearchError('');
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setHotelSearchLoading(true);
      setHotelSearchError('');
      try {
        const response = await fetch(`/api/media/hotels/search?q=${encodeURIComponent(term)}&city=${encodeURIComponent(accommodationDraft.destinationCity)}&type=lodging`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao buscar acomodações');
        const results = Array.isArray(data.results) ? data.results : [];
        setHotelSearchResults(results);
        if (!results.length) setHotelSearchError('Nenhuma acomodação encontrada.');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setHotelSearchError(error instanceof Error ? error.message : 'Não foi possível buscar acomodações agora.');
        }
      } finally {
        if (!controller.signal.aborted) setHotelSearchLoading(false);
      }
    }, 700);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [hotelSearchTerm, accommodationDraft.destinationCity, isManualAccommodation]);

  useEffect(() => {
    const term = activitySearchTerm.trim();
    if (term.length < 3) {
      setActivitySearchResults([]);
      setActivitySearchError('');
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setActivitySearchLoading(true);
      setActivitySearchError('');
      try {
        const city = availableDestinations[0]?.city || '';
        const response = await fetch(`/api/media/hotels/search?q=${encodeURIComponent(term)}&city=${encodeURIComponent(city)}&type=all`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao buscar atividades');
        const results = Array.isArray(data.results) ? data.results : [];
        setActivitySearchResults(results);
        if (!results.length) setActivitySearchError('Nenhuma atividade encontrada.');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setActivitySearchError('Não foi possível buscar atividades agora.');
      } finally {
        if (!controller.signal.aborted) setActivitySearchLoading(false);
      }
    }, 700);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [activitySearchTerm, destinations]);

  const filteredPhotos = libraryPhotos.filter((photo) => {
    const matchesFolder = !selectedFolder || photo.folder === selectedFolder;
    const matchesSearch = photo.name.toLowerCase().includes(searchPhoto.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const availableDestinations = destinations.filter((destination) => destination.city.trim());
  const selectedDestination = availableDestinations.find(
    (destination) => destination.city === accommodationDraft.destinationCity
  );
  const activeTransportOption =
    TRANSPORT_OPTIONS.find((option) => option.type === transportDraft.type) || TRANSPORT_OPTIONS[0];

  const handleCoverFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, coverImage: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleCoverSearchSubmit = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (!coverSearchTerm.trim()) return;

    setIsCoverSearching(true);
    setCoverSearchError('');
    try {
      const response = await fetch(`/api/media/search?q=${encodeURIComponent(coverSearchTerm)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao buscar imagens');
      const results = (data.results || []).map((image: MediaSearchResult) => image.url);
      setCoverSearchResults(results);
      if (!results.length) setCoverSearchError('Nenhuma imagem encontrada para este termo.');
    } catch (error) {
      console.error(error);
      setCoverSearchError('Nao foi possivel buscar imagens agora.');
    } finally {
      setIsCoverSearching(false);
    }
  };

  // Date conversion helper
  const toDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Human readable date display formatting.
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Selecionar data';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);

    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' });
    const day = date.toLocaleDateString('pt-BR', { day: '2-digit' });
    const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

    const weekdayClean = weekday.charAt(0).toUpperCase() + weekday.slice(1).replace('.', '');
    const monthClean = month.charAt(0).toUpperCase() + month.slice(1);
    return `${weekdayClean}, ${day} ${monthClean}`;
  };

  const handleGlobalDatesChange = (start: Date, end: Date) => {
    const startStr = toDateString(start);
    const endStr = toDateString(end);
    setFormData(prev => ({
      ...prev,
      startDate: startStr,
      endDate: endStr,
    }));

    // Reset first destination to match new global dates as default
    setDestinations(prev => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[0] = {
          ...updated[0],
          startDate: startStr,
          endDate: endStr,
        };
      }
      return updated;
    });
  };

  const handleAddDestination = () => {
    setDestinations(prev => [
      ...prev,
      { city: '', startDate: '', endDate: '', allTravelers: true }
    ]);
  };

  const handleRemoveDestination = (idx: number) => {
    setDestinations(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDestinationCityChange = (idx: number, city: string) => {
    setDestinations(prev => {
      const updated = [...prev];
      updated[idx].city = city;
      return updated;
    });
  };

  const handleDestinationDatesChange = (idx: number, start: Date, end: Date) => {
    setDestinations(prev => {
      const updated = [...prev];
      updated[idx].startDate = toDateString(start);
      updated[idx].endDate = toDateString(end);
      return updated;
    });
  };

  const handleClearDestinationDates = (idx: number) => {
    setDestinations(prev => {
      const updated = [...prev];
      updated[idx].startDate = '';
      updated[idx].endDate = '';
      return updated;
    });
  };

  const handleDestinationToggleTravelers = (idx: number, checked: boolean) => {
    setDestinations(prev => {
      const updated = [...prev];
      updated[idx].allTravelers = checked;
      return updated;
    });
  };

  const getBlockedRangesForIndex = (idx: number) => {
    return destinations
      .filter((_, i) => i !== idx)
      .map((d) => ({ start: d.startDate, end: d.endDate }))
      .filter((r) => r.start && r.end);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDocumentsSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setPendingDocuments((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: `pending-doc-${Date.now()}-${file.name}-${Math.random().toString(36).slice(2, 8)}`,
        file,
      })),
    ]);

    e.target.value = '';
  };

  const handleRemovePendingDocument = (documentId: string) => {
    setPendingDocuments((prev) => prev.filter((document) => document.id !== documentId));
  };

  const resetTransportDraft = () => {
    setTransportDraft({
      id: '',
      type: 'voo',
      operator: '',
      number: '',
      date: '',
      details: '',
      bookingReference: '',
      seat: '',
      baggage: '',
    });
  };

  const handleAddTransportation = () => {
    if (!transportDraft.operator.trim() || !transportDraft.date) {
      alert('Preencha pelo menos a operadora e a data do transporte.');
      return;
    }

    const entry = {
        ...transportDraft,
        id: transportDraft.id || `transport-${Date.now()}`,
        operator: transportDraft.operator.trim(),
        number: transportDraft.number.trim(),
        details: transportDraft.details.trim(),
        bookingReference: transportDraft.bookingReference.trim(),
        seat: transportDraft.seat.trim(),
        baggage: transportDraft.baggage.trim(),
      };
    setTransportation((prev) =>
      transportDraft.id ? prev.map((item) => item.id === entry.id ? entry : item) : [...prev, entry]
    );
    resetTransportDraft();
  };

  const handleRemoveTransportation = (transportId: string) => {
    setTransportation((prev) => prev.filter((transport) => transport.id !== transportId));
  };

  const resetAccommodationDraft = (destinationCity = '') => {
    const destination = availableDestinations.find((entry) => entry.city === destinationCity);
    setAccommodationDraft({
      id: '',
      destinationCity,
      name: '',
      address: '',
      checkIn: destination?.startDate || '',
      checkOut: destination?.endDate || '',
      placeId: '',
      photos: [],
      roomCategory: '',
      mealPlan: '',
      reservationNotes: '',
    });
    setHotelSearchTerm('');
    setHotelSearchResults([]);
    setHotelSearchError('');
    setIsManualAccommodation(false);
  };

  const handleAccommodationDestinationChange = (destinationCity: string) => {
    resetAccommodationDraft(destinationCity);
  };

  const handleSelectHotelResult = (result: HotelSearchResult) => {
    const normalizedAddress = normalizeSearch(result.address);
    const matchedDestination = availableDestinations.find((destination) => {
      const city = normalizeSearch(destination.city.split(' (')[0]);
      return city && normalizedAddress.includes(city);
    }) || selectedDestination || availableDestinations[0];
    setAccommodationDraft((prev) => ({
      ...prev,
      destinationCity: matchedDestination?.city || prev.destinationCity,
      name: result.name,
      address: result.address,
      placeId: result.placeId,
      photos: result.photos || [],
      checkIn: matchedDestination?.startDate || prev.checkIn,
      checkOut: matchedDestination?.endDate || prev.checkOut,
    }));
    setHotelSearchResults([]);
    setHotelSearchTerm(result.name);
    setIsManualAccommodation(false);
  };

  const handleSelectActivityResult = (result: HotelSearchResult) => {
    const normalizedAddress = normalizeSearch(result.address);
    const matchedDestination = availableDestinations.find((destination) => normalizedAddress.includes(normalizeSearch(destination.city.split(' (')[0]))) || availableDestinations[0];
    const categories = result.categories || [];
    const suggestedCategory = categories.some((category) => ['restaurant', 'food', 'cafe', 'bar', 'meal_takeaway'].includes(category))
      ? 'gastronomia'
      : categories.some((category) => ['museum', 'tourist_attraction', 'park', 'historical_landmark'].includes(category))
        ? 'passeio'
        : 'passeio';
    setActivityDraft((current) => ({
      ...current,
      name: result.name,
      address: result.address,
      date: matchedDestination?.startDate || formData.startDate || current.date,
      category: suggestedCategory,
      placeId: result.placeId,
      photos: result.photos,
    }));
    setActivitySearchTerm(result.name);
    setActivitySearchResults([]);
  };

  const handleAddAccommodation = () => {
    if (!accommodationDraft.destinationCity) {
      alert('Selecione o destino da acomodacao.');
      return;
    }
    if (!accommodationDraft.name.trim()) {
      alert('Informe ou selecione o nome da acomodacao.');
      return;
    }
    if (!accommodationDraft.checkIn || !accommodationDraft.checkOut) {
      alert('Preencha as datas de check-in e check-out.');
      return;
    }
    if (accommodationDraft.checkIn > accommodationDraft.checkOut) {
      alert('O check-in nao pode ser maior que o check-out.');
      return;
    }

    const destination = availableDestinations.find(
      (entry) => entry.city === accommodationDraft.destinationCity
    );
    if (
      destination &&
      (accommodationDraft.checkIn < destination.startDate ||
        accommodationDraft.checkOut > destination.endDate)
    ) {
      alert('A hospedagem precisa caber dentro do periodo do destino selecionado.');
      return;
    }

    const entry = {
        ...accommodationDraft,
        id: accommodationDraft.id || `accommodation-${Date.now()}`,
        name: accommodationDraft.name.trim(),
        address: accommodationDraft.address?.trim(),
        roomCategory: accommodationDraft.roomCategory?.trim() || '',
        mealPlan: accommodationDraft.mealPlan?.trim() || '',
        reservationNotes: accommodationDraft.reservationNotes?.trim() || '',
      };
    setAccommodations((prev) =>
      accommodationDraft.id ? prev.map((item) => item.id === entry.id ? entry : item) : [...prev, entry]
    );
    resetAccommodationDraft(accommodationDraft.destinationCity);
  };

  const handleRemoveAccommodation = (accommodationId: string) => {
    setAccommodations((prev) =>
      prev.filter((accommodation) => accommodation.id !== accommodationId)
    );
  };

  const resetActivityDraft = () => {
    setActivityDraft({ id: '', name: '', date: '', time: '', address: '', category: 'passeio', voucher: '', supplier: '', ticketsIncluded: false, placeId: '', photos: [] });
    setActivitySearchTerm('');
    setActivitySearchResults([]);
  };

  const handleAddActivity = () => {
    if (!activityDraft.name.trim()) return;
    const entry = { ...activityDraft, id: activityDraft.id || `activity-${Date.now()}`, name: activityDraft.name.trim() };
    const editingId = activityDraft.id;
    setActivities((current) => editingId ? current.map((item) => item.id === editingId ? entry : item) : [...current, entry]);
    resetActivityDraft();
  };

  const logisticsTimeline = useMemo(() => [
    ...transportation.map((item) => ({ id: `transport-${item.id}`, date: item.date, time: '', kind: 'transport' as const, title: `${TRANSPORT_OPTIONS.find((option) => option.type === item.type)?.label || 'Transporte'} · ${item.operator}`, subtitle: item.number || item.details || '', item })),
    ...accommodations.flatMap((item) => [
      { id: `checkin-${item.id}`, date: item.checkIn, time: '15:00', kind: 'accommodation' as const, title: `Check-in · ${item.name}`, subtitle: item.destinationCity, item },
      { id: `checkout-${item.id}`, date: item.checkOut, time: '11:00', kind: 'accommodation' as const, title: `Check-out · ${item.name}`, subtitle: item.destinationCity, item },
    ]),
    ...activities.map((item) => ({ id: `activity-${item.id}`, date: item.date, time: item.time || '', kind: 'activity' as const, title: item.name, subtitle: item.address || item.category || '', item })),
  ].filter((event) => event.date).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)), [transportation, accommodations, activities]);

  const uploadDocumentsToTrip = async (tripId: string) => {
    if (pendingDocuments.length === 0) {
      return { documents: [] as TripDocument[], failedUploads: [] as string[] };
    }

    setUploadingDocuments(true);

    try {
      const uploadedDocuments: TripDocument[] = [];
      const failedUploads: string[] = [];

      for (const pendingDocument of pendingDocuments) {
        const uploadData = new FormData();
        uploadData.append('file', pendingDocument.file);

        try {
          const uploadResponse = await fetch(`/api/trips/${tripId}/documents/upload`, {
            method: 'POST',
            body: uploadData,
          });

          if (!uploadResponse.ok) {
            failedUploads.push(pendingDocument.file.name);
            continue;
          }

          uploadedDocuments.push(await uploadResponse.json());
        } catch {
          failedUploads.push(pendingDocument.file.name);
        }
      }

      if (uploadedDocuments.length > 0) {
        const attachResponse = await fetch(`/api/trips/${tripId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ documents: uploadedDocuments }),
        });

        if (!attachResponse.ok) {
          failedUploads.push(...uploadedDocuments.map((document) => document.name));
        }
      }

      return { documents: uploadedDocuments, failedUploads };
    } finally {
      setUploadingDocuments(false);
    }
  };

  const buildPersistedTrip = (status: 'Rascunho' | 'Pendente') => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      name: formData.title.trim() || 'Rascunho sem título',
      destinations: destinations.map((destination) => destination.city.split(' (')[0]).filter(Boolean),
      destinationsDetail: destinations,
      startDate: formData.startDate || today,
      endDate: formData.endDate || formData.startDate || today,
      travelers: formData.travelerNames ? formData.travelerNames.split(',').map((name) => name.trim().substring(0, 2).toUpperCase()).filter(Boolean) : ['DR'],
      clientName: formData.travelerNames.split(',')[0].trim() || 'Cliente a definir',
      budget: parseFloat(formData.budget) || 0,
      preferences: formData.preferences,
      profile: formData.profile,
      origin: formData.origin,
      coverImage: formData.coverImage,
      status,
      itinerary: [],
      transportation,
      accommodations,
      activities,
      insuranceAndVisas,
      wizardDraft: buildDraftPayload(),
      templateId: selectedTemplateId || undefined,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.startDate || !formData.endDate) {
      alert('Por favor, defina o período global da viagem no calendário.');
      return;
    }

    for (let i = 0; i < destinations.length; i++) {
      const dest = destinations[i];
      if (!dest.city) {
        alert(`Por favor, selecione uma cidade para o destino #${i + 1}.`);
        return;
      }
      if (!dest.startDate || !dest.endDate) {
        alert(`Por favor, selecione o período para o destino ${dest.city}.`);
        return;
      }
    }

    setLoading(true);

    const localTrip: NewTripPayload = {
      id: `LOCAL-${Date.now()}`,
      createdDate: new Date().toLocaleDateString('pt-BR').replace(/\//g, '-'),
      name: formData.title,
      destinations: destinations.map(d => d.city.split(' (')[0]).filter(Boolean),
      destinationsDetail: destinations.map(d => ({
        city: d.city,
        startDate: d.startDate,
        endDate: d.endDate,
        allTravelers: d.allTravelers
      })),
      startDate: formData.startDate,
      endDate: formData.endDate,
      travelers: formData.travelerNames ? formData.travelerNames.split(',').map(n => n.trim().substring(0, 2).toUpperCase()) : ['DR'],
      clientName: formData.travelerNames.split(',')[0].trim() || 'Cliente Geral',
      budget: parseFloat(formData.budget) || 0,
      preferences: formData.preferences,
      profile: formData.profile,
      origin: formData.origin,
      coverImage: formData.coverImage,
      status: 'Pendente',
      itinerary: [],
      transportation,
      accommodations,
      activities,
      insuranceAndVisas,
      documents: pendingDocuments.map((document) => ({
        id: document.id,
        name: document.file.name,
        url: '',
        uploadedAt: new Date().toISOString(),
        size: document.file.size,
      })),
    };

    try {
      const response = await fetch(draftTripId ? `/api/trips/${draftTripId}` : '/api/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.title,
          // Backwards compatibility list of cities
          destinations: destinations.map(d => d.city.split(' (')[0]).filter(Boolean),
          // Detailed list of destinations
          destinationsDetail: destinations.map(d => ({
            city: d.city,
            startDate: d.startDate,
            endDate: d.endDate,
            allTravelers: d.allTravelers
          })),
          startDate: formData.startDate,
          endDate: formData.endDate,
          travelers: formData.travelerNames ? formData.travelerNames.split(',').map(n => n.trim().substring(0, 2).toUpperCase()) : ['DR'],
          clientName: formData.travelerNames.split(',')[0].trim() || 'Cliente Geral',
          budget: parseFloat(formData.budget) || 0,
          preferences: formData.preferences,
          profile: formData.profile,
          origin: formData.origin,
          coverImage: formData.coverImage,
          transportation,
          accommodations,
          activities,
          insuranceAndVisas,
          status: 'Pendente',
          wizardDraft: buildDraftPayload(),
          templateId: selectedTemplateId || undefined,
        }),
      });

      if (response.ok) {
        const newTrip = await response.json();
        const tripForCache: NewTripPayload = {
          ...localTrip,
          ...newTrip,
          documents: Array.isArray(newTrip.documents) ? newTrip.documents : localTrip.documents,
          transportation: Array.isArray(newTrip.transportation)
            ? newTrip.transportation
            : localTrip.transportation,
          accommodations: Array.isArray(newTrip.accommodations)
            ? newTrip.accommodations
            : localTrip.accommodations,
        };
        let failedUploads: string[] = [];

        if (pendingDocuments.length > 0) {
          const uploadResult = await uploadDocumentsToTrip(newTrip.id);
          failedUploads = uploadResult.failedUploads;
        }

        if (failedUploads.length > 0) {
          alert(`A viagem foi criada, mas alguns documentos não foram enviados: ${failedUploads.join(', ')}`);
        }

        upsertLocalTrip(tripForCache);
        router.push(`/trips/${newTrip.id}/edit`);
      } else {
        const data = await response.json().catch(() => ({}));
        if (browserFallbackEnabled && isProductionPersistenceError(String(data.error || ''))) {
          if (pendingDocuments.length > 0) {
            alert('A viagem foi salva no modo local, mas os documentos precisam de persistência no backend para serem anexados.');
          }
          upsertLocalTrip(localTrip);
          router.push(`/trips/${localTrip.id}/edit`);
          return;
        }
        alert(data.error || 'Erro ao criar roteiro no banco de dados.');
      }
    } catch (error) {
      console.error(error);
      if (browserFallbackEnabled) {
        if (pendingDocuments.length > 0) {
          alert('A viagem foi salva no modo local, mas os documentos precisam de conexão com o backend para serem anexados.');
        }
        upsertLocalTrip(localTrip);
        router.push(`/trips/${localTrip.id}/edit`);
        return;
      }
      alert('Erro de conexão ao criar a viagem no backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrichPreferences = async () => {
    setEnrichingPreferences(true);
    setEnrichmentError('');
    setEnrichedSuggestion('');
    try {
      const response = await fetch('/api/ai/preferences/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          origin: formData.origin,
          destinations: destinations.map((destination) => destination.city).filter(Boolean),
          period: `${formData.startDate || 'não definida'} a ${formData.endDate || 'não definida'}`,
          travelers: formData.travelers,
          profile: formData.profile,
          preferences: formData.preferences,
          logistics: {
            transportation: transportation.map(({ type, operator, number, date, details, bookingReference, seat, baggage }) => ({ type, operator, number, date, details, bookingReference, seat, baggage })),
            accommodations: accommodations.map(({ destinationCity, name, address, checkIn, checkOut, roomCategory, mealPlan, reservationNotes }) => ({ destinationCity, name, address, checkIn, checkOut, roomCategory, mealPlan, reservationNotes })),
            activities: activities.map(({ name, date, time, address, category, voucher, supplier, ticketsIncluded }) => ({ name, date, time, address, category, voucher, supplier, ticketsIncluded })),
            insuranceAndVisas: insuranceAndVisas.map(({ type, provider, validity, details }) => ({ type, provider, validity, details })),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao enriquecer o texto.');
      setEnrichedSuggestion(data.enrichedText || '');
    } catch (error) {
      setEnrichmentError(error instanceof Error ? error.message : 'Não foi possível enriquecer o texto agora.');
    } finally {
      setEnrichingPreferences(false);
    }
  };

  const generalStepComplete = Boolean(
    formData.title.trim() &&
    formData.origin.trim() &&
    formData.startDate &&
    formData.endDate &&
    destinations.length &&
    destinations.every((destination) => destination.city && destination.startDate && destination.endDate)
  );
  const currentStepIndex = WIZARD_STEPS.findIndex((step) => step.id === wizardStep);

  const goToStep = (step: WizardStep) => {
    const targetIndex = WIZARD_STEPS.findIndex((item) => item.id === step);
    if (targetIndex > 0 && !generalStepComplete) {
      alert('Complete título, período e destinos para continuar. O rascunho já está salvo.');
      setWizardStep('general');
      return;
    }
    if (targetIndex > currentStepIndex) {
      setCompletedSteps((current) => current.includes(wizardStep) ? current : [...current, wizardStep]);
    }
    setWizardStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveAndExit = async () => {
    setSavingDraft(true);
    try {
      const draftPayload = buildPersistedTrip('Rascunho');
      const response = await fetch(draftTripId ? `/api/trips/${draftTripId}` : '/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftPayload),
      });
      const savedDraft = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(savedDraft.error || 'Não foi possível salvar o rascunho.');
      if (!savedDraft.id || !savedDraft.wizardDraft?.formData) {
        throw new Error('O servidor não confirmou todos os dados do rascunho. Tente novamente.');
      }
      setDraftTripId(savedDraft.id);
      setDraftSavedAt(new Date());
      router.push('/trips?status=Rascunho');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível salvar o rascunho.');
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl py-4 sm:py-8">
      {/* Breadcrumbs */}
      <div className="scroll-reveal flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider text-on-surface opacity-75">
        <Link href="/trips" className="hover:text-primary transition-colors">
          Viagens
        </Link>
        <span>/</span>
        <span className="text-primary">Novo Roteiro</span>
      </div>

      <div className="scroll-reveal scroll-reveal-delay-100 overflow-hidden rounded-[26px] border border-primary/10 bg-white shadow-[0_14px_40px_rgba(16,28,58,.07)]">
        <div className="flex flex-col gap-4 border-b border-primary/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_8px_20px_rgba(7,59,206,.2)]">
            <span className="material-symbols-outlined">route</span>
          </div>
          <div>
        <h2 className="font-headline-lg text-2xl font-black tracking-[-.03em] text-primary mb-1">Criar novo roteiro</h2>
        <p className="text-sm text-on-surface opacity-70">
          Preencha no seu ritmo. Ao pausar, o roteiro fica salvo em Viagens como rascunho.
        </p>
          </div>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700">
              <span className="material-symbols-outlined text-[15px]">cloud_done</span>
              {draftSavedAt ? `Rascunho salvo às ${draftSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Ainda não salvo'}
            </span>
            <button type="button" onClick={saveAndExit} disabled={savingDraft} className="rounded-xl border border-outline-variant px-4 py-2.5 text-xs font-bold text-primary transition hover:bg-surface-container-low disabled:opacity-60">
              {savingDraft ? 'Salvando...' : 'Salvar e sair'}
            </button>
          </div>
        </div>

        {draftResumed && <div className="mx-5 mt-5 flex items-center justify-between rounded-xl border border-primary/15 bg-ice-blue/60 px-4 py-3 text-xs text-primary sm:mx-7"><span><strong>Rascunho retomado.</strong> Você voltou exatamente à etapa onde parou.</span><button type="button" onClick={() => setDraftResumed(false)} className="material-symbols-outlined text-[18px]">close</button></div>}
        {selectedTemplateId && <div className="mx-5 mt-5 flex items-center gap-3 rounded-xl border border-coral/20 bg-coral/5 px-4 py-3 text-xs text-primary sm:mx-7"><span className="material-symbols-outlined text-coral">account_tree</span><span><strong>Modelo inteligente ativo{selectedTemplateName ? `: ${selectedTemplateName}` : ''}.</strong> A IA preservará itens obrigatórios, regras e referências do modelo.</span></div>}

        <div className="grid lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="border-b border-primary/10 bg-surface-container-low/70 p-4 lg:border-b-0 lg:border-r lg:p-5">
            <p className="mb-3 px-2 text-[9px] font-black uppercase tracking-[.18em] text-on-surface/40">Progresso da viagem</p>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {WIZARD_STEPS.map((step, index) => {
                const active = wizardStep === step.id;
                const completed = completedSteps.includes(step.id) && (step.id !== 'general' || generalStepComplete);
                return <button key={step.id} type="button" onClick={() => goToStep(step.id)} className={`flex items-center gap-3 rounded-xl p-3 text-left transition ${active ? 'bg-primary text-white shadow-sm' : 'text-on-surface hover:bg-white'}`}>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-white/15' : completed ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-primary'}`}><span className={`material-symbols-outlined text-[17px] ${completed ? 'motion-check-in' : ''}`}>{completed ? 'check' : step.icon}</span></span>
                  <span className="min-w-0"><span className="block text-[11px] font-black">{index + 1}. {step.label}</span><span className={`mt-0.5 hidden text-[9px] lg:block ${active ? 'text-white/65' : completed ? 'font-bold text-emerald-700' : 'text-on-surface/45'}`}>{completed ? 'Concluído · clique para editar' : step.description}</span></span>
                </button>;
              })}
            </div>
            <div className="mt-5 hidden rounded-xl border border-primary/10 bg-white p-3 lg:block"><p className="text-[10px] font-bold text-primary">Pode continuar depois</p><p className="mt-1 text-[9px] leading-relaxed text-on-surface/50">Use “Salvar e sair”. O roteiro aparecerá em Viagens com o estado “Rascunho”.</p></div>
          </aside>

        <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-7">

          {wizardStep === 'general' && <div className="motion-panel-in space-y-6">
          {/* Title and Origin */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface opacity-75">Título da Viagem *</label>
              <input
                required
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Ex: Férias de Verão Europa"
                className="input-interactive border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface opacity-75">Origem *</label>
              <SearchableCitySelect
                value={formData.origin}
                onChange={(val) => setFormData(prev => ({ ...prev, origin: val }))}
                placeholder="Selecione a origem..."
              />
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant overflow-hidden">
            <div className="relative h-52 bg-surface-container-low">
              {formData.coverImage ? (
                <img src={formData.coverImage} alt="Capa da viagem" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                  <span className="material-symbols-outlined text-4xl text-primary opacity-70">add_photo_alternate</span>
                  <p className="text-sm font-black text-on-surface mt-2">Foto de capa da viagem</p>
                  <p className="text-[11px] text-on-surface opacity-60 mt-1">
                    Essa imagem aparece grande no feed do cliente final.
                  </p>
                </div>
              )}
              {formData.coverImage && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, coverImage: '' }))}
                  className="absolute right-3 top-3 h-8 w-8 rounded-full bg-white/95 text-red-600 shadow-sm flex items-center justify-center hover:bg-white"
                  title="Remover capa"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              )}
            </div>

            <div className="p-4 space-y-4">
              <div className="flex text-xs font-bold border-b border-outline-variant">
                {(['browse', 'upload', 'search'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setCoverPickerTab(tab)}
                    className={`flex-1 pb-2 border-b-2 transition-colors ${
                      coverPickerTab === tab ? 'border-primary text-primary' : 'border-transparent opacity-60'
                    }`}
                  >
                    {tab === 'browse' ? 'Biblioteca' : tab === 'upload' ? 'Upload' : 'Pixabay'}
                  </button>
                ))}
              </div>

              {coverPickerTab === 'browse' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2">
                    <select
                      value={selectedFolder || ''}
                      onChange={(event) => setSelectedFolder(event.target.value || null)}
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
                      onChange={(event) => setSearchPhoto(event.target.value)}
                      className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                    {filteredPhotos.map((photo) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, coverImage: photo.url }))}
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
                      onChange={(event) => setCoverSearchTerm(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          event.stopPropagation();
                          handleCoverSearchSubmit();
                        }
                      }}
                      placeholder="Ex: Joao Pessoa beach sunset"
                      className="flex-1 border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCoverSearchSubmit()}
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
                        onClick={() => setFormData((prev) => ({ ...prev, coverImage: url }))}
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

          {/* Global Trip Dates Range Selector */}
          <div className="flex flex-col gap-1 relative">
            <label className="text-xs font-semibold text-on-surface opacity-75">Período Global da Viagem *</label>
            <div 
              onClick={() => setShowGlobalCalendar(prev => !prev)}
              className="calendar-trigger border border-outline-variant rounded-lg p-2.5 text-xs flex items-center gap-2 bg-white cursor-pointer hover:bg-surface-container-low transition-all"
            >
              <span className="material-symbols-outlined text-[18px] text-on-surface opacity-75">calendar_month</span>
              <span className="flex-1 font-semibold text-xs">
                {formData.startDate && formData.endDate 
                  ? `${formatDateDisplay(formData.startDate)} - ${formatDateDisplay(formData.endDate)}`
                  : 'Selecionar período global da viagem'}
              </span>
            </div>
            
            {showGlobalCalendar && (
              <div className="absolute z-[120] top-full left-0">
                <CalendarPicker
                  isOpen={showGlobalCalendar}
                  onClose={() => setShowGlobalCalendar(false)}
                  onSelectRange={handleGlobalDatesChange}
                  initialStart={formData.startDate ? new Date(formData.startDate + 'T12:00:00') : undefined}
                  initialEnd={formData.endDate ? new Date(formData.endDate + 'T12:00:00') : undefined}
                />
              </div>
            )}
          </div>

          {/* Dynamic Multiple Destinations Section */}
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <div>
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Destinos e Paradas</h3>
                <p className="text-[10px] text-on-surface opacity-75">
                  Adicione as cidades de destino e o período de estadia do viajante em cada uma.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddDestination}
                className="w-8 h-8 rounded-full border border-outline flex items-center justify-center text-primary font-bold text-lg transition-all duration-300 hover:bg-primary hover:text-on-primary hover:border-primary hover:rotate-90 hover:scale-110 active:scale-95 hover:shadow-lg cursor-pointer"
              >
                +
              </button>
            </div>

            <div className="space-y-4">
              {destinations.map((dest, idx) => (
                <div key={idx} className="border border-outline-variant rounded-lg p-4 bg-white space-y-3 relative">
                  
                  {/* Row 1: Cidade & Data */}
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                    
                    {/* Cidade Searchable Dropdown */}
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-on-surface opacity-70">Cidade</label>
                      <SearchableCitySelect
                        value={dest.city}
                        onChange={(val) => handleDestinationCityChange(idx, val)}
                        placeholder="Ex: Rio de Janeiro, Buenos Aires, Atacama..."
                      />
                    </div>

                    {/* Período Date Range */}
                    <div className="flex-1 flex flex-col gap-1 relative">
                      <label className="text-[10px] font-bold text-on-surface opacity-70">Período</label>
                        <div 
                          onClick={() => {
                            if (!formData.startDate || !formData.endDate) {
                              alert('Por favor, selecione as datas globais da viagem primeiro.');
                              return;
                            }
                            setActiveDestCalendarIndex(prev => prev === idx ? null : idx);
                          }}
                          className="calendar-trigger border border-outline-variant rounded-lg p-2.5 text-xs flex items-center gap-2 bg-white cursor-pointer hover:bg-surface-container-low transition-all"
                        >
                        <span className="material-symbols-outlined text-[16px] text-on-surface opacity-70">calendar_month</span>
                        <span className="flex-1 text-on-surface text-xs font-semibold truncate">
                          {dest.startDate && dest.endDate 
                            ? `${formatDateDisplay(dest.startDate)} - ${formatDateDisplay(dest.endDate)}`
                            : 'Selecionar período'}
                        </span>
                        {dest.startDate && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearDestinationDates(idx);
                            }}
                            className="text-on-surface opacity-60 hover:opacity-100 font-bold ml-1"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {activeDestCalendarIndex === idx && (
                        <div className="absolute z-[110] top-full right-0">
                          <CalendarPicker
                            isOpen={activeDestCalendarIndex === idx}
                            onClose={() => setActiveDestCalendarIndex(null)}
                            onSelectRange={(start, end) => handleDestinationDatesChange(idx, start, end)}
                            minDate={new Date(formData.startDate + 'T00:00:00')}
                            maxDate={new Date(formData.endDate + 'T23:59:59')}
                            initialStart={dest.startDate ? new Date(dest.startDate + 'T12:00:00') : undefined}
                            initialEnd={dest.endDate ? new Date(dest.endDate + 'T12:00:00') : undefined}
                            blockedRanges={getBlockedRangesForIndex(idx)}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Toggle & Delete */}
                  <div className="flex justify-between items-center pt-2 border-t border-outline-variant/50">
                    
                    {/* Toggle: Aplica-se a todos os viajantes */}
                    <div className="flex items-center gap-2">
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={dest.allTravelers}
                          onChange={(e) => handleDestinationToggleTravelers(idx, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-surface/80 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary peer-checked:after:bg-on-primary peer-checked:after:translate-x-4"></div>
                      </label>
                      <span className="text-[10px] font-bold text-on-surface opacity-75">
                        Aplica-se a todos os viajantes
                      </span>
                    </div>

                    {/* Delete Icon */}
                    {destinations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDestination(idx)}
                        className="btn-interactive w-8 h-8 flex items-center justify-center rounded-full hover:bg-error/10 text-error transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Qtd Viajantes, Perfil e Nomes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface opacity-75">Quantidade de Viajantes</label>
              <select
                name="travelers"
                value={formData.travelers}
                onChange={handleChange}
                className="input-interactive border border-outline-variant rounded-lg p-2.5 text-xs bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'viajante' : 'viajantes'}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs font-semibold text-on-surface opacity-75">Nomes dos Viajantes (separados por vírgula)</label>
              <input
                type="text"
                name="travelerNames"
                value={formData.travelerNames}
                onChange={handleChange}
                placeholder="Ex: Raquel Rasera, Daniel Turbox"
                className="input-interactive border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          {/* Orçamento e Perfil de Viagem */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface opacity-75">Perfil de Viagem</label>
              <select
                name="profile"
                value={formData.profile}
                onChange={handleChange}
                className="input-interactive border border-outline-variant rounded-lg p-2.5 text-xs bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              >
                <option value="lazer">Lazer / Férias</option>
                <option value="lua_de_mel">Lua de Mel</option>
                <option value="aventura">Aventura</option>
                <option value="cultural">Cultural</option>
                <option value="negocios">Negócios</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface opacity-75">Orçamento Estimado (R$)</label>
              <input
                type="number"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                placeholder="Ex: 25000"
                className="input-interactive border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          {/* Preferências e Observações */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface opacity-75">
              Restrições Alimentares ou Preferências Especiais
            </label>
            <textarea
              name="preferences"
              value={formData.preferences}
              onChange={handleChange}
              rows={3}
              placeholder="Ex: Alimentação vegana, preferência por hotéis boutique, sem escadas."
              className="input-interactive border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
            />
          </div>

          <div className="flex items-center justify-between border-t border-outline-variant pt-4"><span className="text-[10px] text-on-surface/45">Campos com * são necessários para avançar.</span><button type="button" onClick={() => goToStep('logistics')} className="rounded-xl bg-primary px-5 py-3 text-xs font-bold text-white">Continuar para logística <span className="material-symbols-outlined ml-1 text-[15px]">arrow_forward</span></button></div>
          </div>}

          {wizardStep === 'logistics' && <div className="motion-panel-in space-y-6">
          <div className="rounded-xl border border-outline-variant bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant bg-surface-container-low">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                Logística da Viagem
              </h3>
              <p className="text-[11px] text-on-surface opacity-70 mt-1">
                Cadastre transportes e hospedagens para dar contexto completo à IA.
              </p>
            </div>

            {logisticsTimeline.length > 0 && (
              <div className="border-b border-outline-variant bg-ice-blue/35 px-5 py-4">
                <p className="mb-3 text-[10px] font-black uppercase tracking-wider text-primary">Linha do tempo da viagem</p>
                <div className="space-y-2">
                  {logisticsTimeline.map((event) => (
                    <div key={event.id} className="flex items-center gap-3 rounded-xl border border-primary/10 bg-white px-3 py-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <span className="material-symbols-outlined text-[18px]">{event.kind === 'transport' ? 'route' : event.kind === 'accommodation' ? 'hotel' : 'local_activity'}</span>
                      </div>
                      <div className="min-w-0 flex-1"><p className="text-[11px] font-black">{event.date}{event.time ? ` · ${event.time}` : ''}</p><p className="truncate text-xs font-semibold">{event.title}</p>{event.subtitle && <p className="truncate text-[10px] text-on-surface/55">{event.subtitle}</p>}</div>
                      <button type="button" title="Editar" onClick={() => { if (event.kind === 'transport') { setTransportDraft(event.item as TransportationEntry); setActiveLogisticsTab('transport'); } else if (event.kind === 'accommodation') { const item = event.item as AccommodationEntry; setAccommodationDraft(item); setHotelSearchTerm(item.name); setIsManualAccommodation(true); setActiveLogisticsTab('hotel'); } else { const item = event.item as ActivityEntry; setActivityDraft(item); setActivitySearchTerm(item.name); setActiveLogisticsTab('activities'); } }} className="rounded-full p-1.5 text-primary hover:bg-primary/10"><span className="material-symbols-outlined text-[16px]">edit</span></button>
                      <button type="button" title="Remover" onClick={() => { if (event.kind === 'transport') handleRemoveTransportation(event.item.id); else if (event.kind === 'accommodation') handleRemoveAccommodation(event.item.id); else setActivities((current) => current.filter((item) => item.id !== event.item.id)); }} className="rounded-full p-1.5 text-error hover:bg-error/10"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="px-5 pt-4 flex gap-2 border-b border-outline-variant">
              <button
                type="button"
                onClick={() => setActiveLogisticsTab('transport')}
                className={`px-3 py-2 text-xs font-bold rounded-t-lg border border-b-0 transition-colors ${
                  activeLogisticsTab === 'transport'
                    ? 'bg-white text-primary border-outline-variant'
                    : 'bg-surface-container-low text-on-surface opacity-70 border-transparent'
                }`}
              >
                Transporte
              </button>
              <button
                type="button"
                onClick={() => setActiveLogisticsTab('hotel')}
                className={`px-3 py-2 text-xs font-bold rounded-t-lg border border-b-0 transition-colors ${
                  activeLogisticsTab === 'hotel'
                    ? 'bg-white text-primary border-outline-variant'
                    : 'bg-surface-container-low text-on-surface opacity-70 border-transparent'
                }`}
              >
                Hotel
              </button>
              <button type="button" onClick={() => setActiveLogisticsTab('activities')} className={`px-3 py-2 text-xs font-bold rounded-t-lg border border-b-0 transition-colors ${activeLogisticsTab === 'activities' ? 'bg-white text-primary border-outline-variant' : 'bg-surface-container-low text-on-surface opacity-70 border-transparent'}`}>Atividades & Passeios</button>
              <button type="button" onClick={() => setActiveLogisticsTab('insurance')} className={`px-3 py-2 text-xs font-bold rounded-t-lg border border-b-0 transition-colors ${activeLogisticsTab === 'insurance' ? 'bg-white text-primary border-outline-variant' : 'bg-surface-container-low text-on-surface opacity-70 border-transparent'}`}>Seguro & Vistos</button>
            </div>

            <div className="p-5">
              {activeLogisticsTab === 'transport' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[120px_1.1fr_90px_130px_90px_1.4fr] gap-2 items-center">
                    {/* Modal */}
                    <div className="w-full">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                          {activeTransportOption.emoji}
                        </span>
                        <select
                          value={transportDraft.type}
                          onChange={(event) =>
                            setTransportDraft((prev) => ({
                              ...prev,
                              type: event.target.value as TransportationType,
                            }))
                          }
                          className="w-full h-10 border border-outline-variant rounded-lg pl-9 pr-8 text-xs bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none font-medium"
                        >
                          {TRANSPORT_OPTIONS.map((option) => (
                            <option key={option.type} value={option.type}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] pointer-events-none opacity-60">
                          keyboard_arrow_down
                        </span>
                      </div>
                    </div>

                    {/* Cia Aérea */}
                    <div className="w-full">
                      <input
                        type="text"
                        value={transportDraft.operator}
                        onChange={(event) =>
                          setTransportDraft((prev) => ({ ...prev, operator: event.target.value }))
                        }
                        placeholder={transportDraft.type === 'voo' ? 'Cia. Aérea' : 'Operadora'}
                        className="w-full h-10 border border-outline-variant rounded-lg px-3 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      />
                    </div>

                    {/* Voo # */}
                    <div className="w-full">
                      <input
                        type="text"
                        value={transportDraft.number}
                        onChange={(event) =>
                          setTransportDraft((prev) => ({ ...prev, number: event.target.value }))
                        }
                        placeholder={transportDraft.type === 'voo' ? 'Voo #' : 'Código'}
                        className="w-full h-10 border border-outline-variant rounded-lg px-3 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      />
                    </div>

                    {/* Data */}
                    <div className="w-full">
                      <input
                        type="date"
                        value={transportDraft.date}
                        min={formData.startDate || undefined}
                        max={formData.endDate || undefined}
                        onChange={(event) =>
                          setTransportDraft((prev) => ({ ...prev, date: event.target.value }))
                        }
                        className="w-full h-10 border border-outline-variant rounded-lg px-3 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      />
                    </div>

                    {/* Adicionar */}
                    <div className="w-full">
                      <button
                        type="button"
                        onClick={handleAddTransportation}
                        className="w-full h-10 rounded-lg bg-primary text-on-primary text-xs font-bold hover:opacity-95 transition-opacity"
                      >
                        Adicionar
                      </button>
                    </div>

                    {/* Detalhes */}
                    <div className="w-full">
                      <input
                        type="text"
                        value={transportDraft.details}
                        onChange={(event) =>
                          setTransportDraft((prev) => ({ ...prev, details: event.target.value }))
                        }
                        placeholder={
                          transportDraft.type === 'voo'
                            ? 'Insira detalhes do voo'
                            : 'Insira detalhes do transporte'
                        }
                        className="w-full h-10 border border-outline-variant rounded-lg px-3 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <input value={transportDraft.bookingReference} onChange={(event) => setTransportDraft((prev) => ({ ...prev, bookingReference: event.target.value }))} placeholder="Localizador da reserva" className="h-10 rounded-lg border border-outline-variant px-3 text-xs" />
                    <input value={transportDraft.seat} onChange={(event) => setTransportDraft((prev) => ({ ...prev, seat: event.target.value }))} placeholder="Assento" className="h-10 rounded-lg border border-outline-variant px-3 text-xs" />
                    <input value={transportDraft.baggage} onChange={(event) => setTransportDraft((prev) => ({ ...prev, baggage: event.target.value }))} placeholder="Bagagem incluída" className="h-10 rounded-lg border border-outline-variant px-3 text-xs" />
                  </div>

                  {transportation.length > 0 ? (
                    <div className="space-y-2">
                      {transportation.map((transport) => {
                        const option = TRANSPORT_OPTIONS.find((item) => item.type === transport.type);
                        return (
                          <div
                            key={transport.id}
                            className="flex items-start justify-between gap-3 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-3"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-on-surface">
                                {option?.emoji} {option?.label} • {transport.operator}
                                {transport.number ? ` ${transport.number}` : ''}
                              </p>
                              <p className="text-[11px] text-on-surface opacity-70 mt-1">
                                {transport.date}
                              </p>
                              {transport.details && (
                                <p className="text-[11px] text-on-surface opacity-70 mt-1">
                                  {transport.details}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveTransportation(transport.id)}
                              className="rounded-full p-1 text-red-500 hover:bg-red-50 hover:text-red-700"
                              title="Remover transporte"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-outline-variant p-4 text-[11px] text-on-surface opacity-65">
                      Nenhum transporte adicionado ainda.
                    </div>
                  )}
                </div>
              ) : activeLogisticsTab === 'hotel' ? (
                <div className="space-y-4">
                  {availableDestinations.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-4 text-xs text-amber-900">
                      Para adicionar as acomodações, você precisa primeiro adicionar o(s) destino(s).
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_130px] gap-3 items-end">
                        {/* Destino select */}
                        <label className="w-full space-y-1.5">
                          <span className="flex items-center gap-1.5 text-[11px] font-bold text-on-surface/70">
                            <span className="material-symbols-outlined text-[15px] text-primary">location_on</span>
                            Destino da hospedagem
                          </span>
                          <select
                            value={accommodationDraft.destinationCity}
                            onChange={(event) =>
                              handleAccommodationDestinationChange(event.target.value)
                            }
                            className="w-full h-11 border border-outline-variant rounded-xl px-3 text-xs font-semibold bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                          >
                            <option value="">Selecione o destino</option>
                            {availableDestinations.map((destination) => (
                              <option key={destination.city} value={destination.city}>
                                {destination.city}
                              </option>
                            ))}
                          </select>
                        </label>

                        {/* Busca autocomplete input */}
                        {!isManualAccommodation ? (
                          <label className="relative w-full space-y-1.5">
                            <span className="flex items-center justify-between gap-2 text-[11px] font-bold text-on-surface/70">
                              <span>Buscar hotel</span>
                              {accommodationDraft.destinationCity && (
                                <span className="inline-flex max-w-[65%] items-center gap-1 truncate rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                  <span className="material-symbols-outlined text-[12px]">near_me</span>
                                  em {accommodationDraft.destinationCity}
                                </span>
                              )}
                            </span>
                            <div className="relative">
                              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-3 text-[18px] text-primary/70">search</span>
                              <input
                                type="text"
                                value={hotelSearchTerm}
                                onChange={(event) => setHotelSearchTerm(event.target.value)}
                                disabled={!accommodationDraft.destinationCity}
                                autoComplete="off"
                                placeholder={accommodationDraft.destinationCity ? `Digite o nome do hotel em ${accommodationDraft.destinationCity}` : 'Selecione primeiro o destino'}
                                className="w-full h-11 border border-outline-variant rounded-xl pl-10 pr-10 text-xs bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:opacity-70"
                              />
                              {hotelSearchLoading && <span className="material-symbols-outlined absolute right-3 top-3 animate-spin text-[18px] text-primary">progress_activity</span>}

                              {(hotelSearchResults.length > 0 || hotelSearchError) && hotelSearchTerm.trim().length >= 3 && (
                                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-xl border border-primary/15 bg-white shadow-[0_18px_45px_rgba(8,35,84,0.16)]">
                                  {hotelSearchError ? (
                                    <p className="px-4 py-3 text-[11px] font-semibold text-error">{hotelSearchError}</p>
                                  ) : (
                                    <div className="max-h-80 overflow-y-auto p-1.5">
                                      {hotelSearchResults.map((result) => (
                                        <button
                                          key={result.id}
                                          type="button"
                                          onClick={() => handleSelectHotelResult(result)}
                                          className="group flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-primary/5 focus:bg-primary/5 focus:outline-none"
                                        >
                                          {result.photos?.[0] ? (
                                            <img src={result.photos[0]} alt="" className="h-12 w-14 shrink-0 rounded-lg bg-surface-container-low object-cover" />
                                          ) : (
                                            <span className="flex h-12 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                                              <span className="material-symbols-outlined">hotel</span>
                                            </span>
                                          )}
                                          <span className="min-w-0 flex-1">
                                            <span className="block truncate text-xs font-bold text-on-surface">{result.name}</span>
                                            <span className="mt-0.5 block truncate text-[10px] text-on-surface/60">{result.address}</span>
                                          </span>
                                          <span className="material-symbols-outlined text-[18px] text-primary opacity-0 transition-opacity group-hover:opacity-100">arrow_forward</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <span className="block text-[10px] font-normal text-on-surface/50">Digite pelo menos 3 letras para ver hotéis reais.</span>
                          </label>
                        ) : (
                          <div className="w-full text-xs text-on-surface opacity-60 flex items-center h-11 px-1">
                            Preenchendo acomodação manualmente
                          </div>
                        )}

                        <div className="w-full pb-[18px]">
                          <button
                            type="button"
                            onClick={() => setIsManualAccommodation((prev) => !prev)}
                            className="w-full h-11 rounded-xl border border-outline-variant text-xs font-bold hover:bg-surface-container-low transition-colors"
                          >
                            {isManualAccommodation ? 'Usar Busca API' : 'Criar Novo'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1 md:col-span-2">
                          <label className="flex items-center justify-between gap-2 text-[11px] font-semibold text-on-surface opacity-75">
                            <span>Nome da acomodação</span>
                            {accommodationDraft.placeId && <span className="text-[9px] font-bold text-emerald-700">Preenchido pelo Google</span>}
                          </label>
                          <input
                            type="text"
                            value={accommodationDraft.name}
                            onChange={(event) =>
                              setAccommodationDraft((prev) => ({ ...prev, name: event.target.value }))
                            }
                            placeholder="Ex: Copacabana Palace"
                            className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                          />
                        </div>

                        <div className="flex flex-col gap-1 md:col-span-2">
                          <label className="flex items-center justify-between gap-2 text-[11px] font-semibold text-on-surface opacity-75">
                            <span>Endereço</span>
                            {accommodationDraft.placeId && <span className="text-[9px] font-bold text-emerald-700">Preenchido pelo Google</span>}
                          </label>
                          <input
                            type="text"
                            value={accommodationDraft.address || ''}
                            onChange={(event) =>
                              setAccommodationDraft((prev) => ({ ...prev, address: event.target.value }))
                            }
                            placeholder="Endereco completo ou referencia"
                            className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-semibold text-on-surface opacity-75">Check-in</label>
                          <input
                            type="date"
                            value={accommodationDraft.checkIn}
                            min={selectedDestination?.startDate || formData.startDate || undefined}
                            max={selectedDestination?.endDate || formData.endDate || undefined}
                            onChange={(event) =>
                              setAccommodationDraft((prev) => ({ ...prev, checkIn: event.target.value }))
                            }
                            className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-semibold text-on-surface opacity-75">Check-out</label>
                          <input
                            type="date"
                            value={accommodationDraft.checkOut}
                            min={selectedDestination?.startDate || formData.startDate || undefined}
                            max={selectedDestination?.endDate || formData.endDate || undefined}
                            onChange={(event) =>
                              setAccommodationDraft((prev) => ({ ...prev, checkOut: event.target.value }))
                            }
                            className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                          />
                        </div>
                        <label className="space-y-1"><span className="text-[10px] font-semibold text-on-surface/60">Dados da reserva</span><input value={accommodationDraft.roomCategory || ''} onChange={(event) => setAccommodationDraft((prev) => ({ ...prev, roomCategory: event.target.value }))} placeholder="Categoria do quarto (ex.: Deluxe)" className="w-full rounded-lg border border-outline-variant p-2.5 text-xs" /></label>
                        <label className="space-y-1"><span className="text-[10px] font-semibold text-on-surface/60">Dados da reserva</span><input value={accommodationDraft.mealPlan || ''} onChange={(event) => setAccommodationDraft((prev) => ({ ...prev, mealPlan: event.target.value }))} placeholder="Regime de alimentação (ex.: café incluso)" className="w-full rounded-lg border border-outline-variant p-2.5 text-xs" /></label>
                        <label className="space-y-1 md:col-span-2"><span className="text-[10px] font-semibold text-on-surface/60">Informação da reserva, voucher ou consultor</span><textarea value={accommodationDraft.reservationNotes || ''} onChange={(event) => setAccommodationDraft((prev) => ({ ...prev, reservationNotes: event.target.value }))} placeholder="Observações da reserva" rows={2} className="w-full rounded-lg border border-outline-variant p-2.5 text-xs" /></label>
                      </div>

                      {accommodationDraft.photos && accommodationDraft.photos.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {accommodationDraft.photos.slice(0, 3).map((photo, index) => (
                            <div
                              key={`${accommodationDraft.placeId || accommodationDraft.name}-${index}`}
                              className="aspect-[4/3] overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low"
                            >
                              <img
                                src={photo}
                                alt={`Foto de ${accommodationDraft.name || 'acomodacao'}`}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleAddAccommodation}
                          className="h-[42px] px-4 rounded-lg bg-primary text-on-primary text-xs font-bold hover:opacity-95"
                        >
                          Adicionar acomodacao
                        </button>
                      </div>

                      {accommodations.length > 0 ? (
                        <div className="space-y-2">
                          {accommodations.map((accommodation) => (
                            <div
                              key={accommodation.id}
                              className="flex items-start justify-between gap-3 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-3"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-on-surface">
                                  {accommodation.name} • {accommodation.destinationCity}
                                </p>
                                <p className="text-[11px] text-on-surface opacity-70 mt-1">
                                  {accommodation.checkIn} a {accommodation.checkOut}
                                </p>
                                {accommodation.address && (
                                  <p className="text-[11px] text-on-surface opacity-70 mt-1">
                                    {accommodation.address}
                                  </p>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveAccommodation(accommodation.id)}
                                className="rounded-full p-1 text-red-500 hover:bg-red-50 hover:text-red-700"
                                title="Remover acomodacao"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-outline-variant p-4 text-[11px] text-on-surface opacity-65">
                          Nenhuma acomodacao adicionada ainda.
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : activeLogisticsTab === 'activities' ? (
                <div className="space-y-4">
                  <div className="relative"><input value={activitySearchTerm} onChange={(event) => { setActivitySearchTerm(event.target.value); setActivityDraft((current) => ({ ...current, name: event.target.value })); }} placeholder="Busque uma atração, museu, parque ou restaurante" className="h-11 w-full rounded-xl border border-outline-variant px-4 pr-10 text-xs" />{activitySearchLoading && <span className="material-symbols-outlined absolute right-3 top-3 animate-spin text-[18px] text-primary">progress_activity</span>}</div>
                  {activitySearchError && <p className="text-[11px] font-semibold text-error">{activitySearchError}</p>}
                  {activitySearchResults.length > 0 && <div className="space-y-1 rounded-xl border border-outline-variant bg-surface-container-low p-2">{activitySearchResults.map((result) => <button key={result.id} type="button" onClick={() => handleSelectActivityResult(result)} className="w-full rounded-lg bg-white p-3 text-left hover:bg-primary/5"><p className="text-xs font-bold">{result.name}</p><p className="text-[10px] text-on-surface/55">{result.address}</p></button>)}</div>}
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><input value={activityDraft.name} onChange={(event) => setActivityDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Nome da atividade" className="rounded-lg border border-outline-variant p-2.5 text-xs lg:col-span-2" /><input type="date" value={activityDraft.date} onChange={(event) => setActivityDraft((current) => ({ ...current, date: event.target.value }))} className="rounded-lg border border-outline-variant p-2.5 text-xs" /><input type="time" value={activityDraft.time} onChange={(event) => setActivityDraft((current) => ({ ...current, time: event.target.value }))} className="rounded-lg border border-outline-variant p-2.5 text-xs" /></div>
                  <div className="grid gap-2 sm:grid-cols-2"><input value={activityDraft.address} onChange={(event) => setActivityDraft((current) => ({ ...current, address: event.target.value }))} placeholder="Endereço" className="rounded-lg border border-outline-variant p-2.5 text-xs" /><select value={activityDraft.category} onChange={(event) => setActivityDraft((current) => ({ ...current, category: event.target.value }))} className="rounded-lg border border-outline-variant bg-white p-2.5 text-xs"><option value="passeio">Passeio</option><option value="ingresso">Ingresso</option><option value="gastronomia">Gastronomia</option><option value="evento">Evento</option></select><input value={activityDraft.voucher} onChange={(event) => setActivityDraft((current) => ({ ...current, voucher: event.target.value }))} placeholder="Voucher" className="rounded-lg border border-outline-variant p-2.5 text-xs" /><input value={activityDraft.supplier} onChange={(event) => setActivityDraft((current) => ({ ...current, supplier: event.target.value }))} placeholder="Fornecedor" className="rounded-lg border border-outline-variant p-2.5 text-xs" /></div>
                  <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={activityDraft.ticketsIncluded} onChange={(event) => setActivityDraft((current) => ({ ...current, ticketsIncluded: event.target.checked }))} /> Ingressos incluídos</label><button type="button" disabled={!activityDraft.name.trim()} onClick={handleAddActivity} className="rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">{activityDraft.id ? 'Salvar alterações' : 'Adicionar atividade'}</button></div>
                  {activities.map((activity) => <div key={activity.id} className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-low p-3"><div><p className="text-xs font-bold">{activity.name}</p><p className="text-[10px] text-on-surface/55">{activity.date} {activity.time} · {activity.address || activity.category}</p></div><button type="button" onClick={() => setActivities((current) => current.filter((item) => item.id !== activity.id))}><span className="material-symbols-outlined text-[17px] text-error">delete</span></button></div>)}
                  {!activities.length && <p className="rounded-xl border border-dashed border-outline-variant p-5 text-center text-xs text-on-surface/50">Nenhum passeio contratado adicionado.</p>}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"><select value={insuranceDraft.type} onChange={(event) => setInsuranceDraft((current) => ({ ...current, type: event.target.value as InsuranceEntry['type'] }))} className="rounded-lg border border-outline-variant bg-white p-2.5 text-xs"><option value="insurance">Seguro viagem</option><option value="visa">Visto</option></select><input value={insuranceDraft.provider} onChange={(event) => setInsuranceDraft((current) => ({ ...current, provider: event.target.value }))} placeholder="Seguradora / País" className="rounded-lg border border-outline-variant p-2.5 text-xs" /><input value={insuranceDraft.reference} onChange={(event) => setInsuranceDraft((current) => ({ ...current, reference: event.target.value }))} placeholder="Apólice / referência" className="rounded-lg border border-outline-variant p-2.5 text-xs" /><input type="date" value={insuranceDraft.validity} onChange={(event) => setInsuranceDraft((current) => ({ ...current, validity: event.target.value }))} className="rounded-lg border border-outline-variant p-2.5 text-xs" /><button type="button" disabled={!insuranceDraft.provider.trim()} onClick={() => { setInsuranceAndVisas((current) => [...current, { id: `insurance-${Date.now()}`, ...insuranceDraft }]); setInsuranceDraft({ type: 'insurance', provider: '', reference: '', validity: '', details: '' }); }} className="rounded-lg bg-primary px-4 text-xs font-bold text-white disabled:opacity-50">Adicionar</button></div>
                  <textarea value={insuranceDraft.details} onChange={(event) => setInsuranceDraft((current) => ({ ...current, details: event.target.value }))} placeholder="Cobertura, observações ou requisitos do visto..." rows={2} className="w-full rounded-lg border border-outline-variant p-2.5 text-xs" />
                  {insuranceAndVisas.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-low p-3"><div><p className="text-xs font-bold">{item.type === 'insurance' ? 'Seguro' : 'Visto'} · {item.provider}</p><p className="text-[10px] text-on-surface/55">{item.reference || 'Sem referência'} · validade {item.validity || 'não informada'}</p></div><button type="button" onClick={() => setInsuranceAndVisas((current) => current.filter((entry) => entry.id !== item.id))}><span className="material-symbols-outlined text-[17px] text-error">delete</span></button></div>)}
                  {!insuranceAndVisas.length && <p className="rounded-xl border border-dashed border-outline-variant p-5 text-center text-xs text-on-surface/50">Nenhum seguro ou visto adicionado.</p>}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between"><button type="button" onClick={() => goToStep('general')} className="rounded-xl border border-outline-variant px-4 py-3 text-xs font-bold">Voltar</button><button type="button" onClick={() => goToStep('ai')} className="rounded-xl bg-primary px-5 py-3 text-xs font-bold text-white">Configurar IA <span className="material-symbols-outlined ml-1 text-[15px]">arrow_forward</span></button></div>
          </div>}

          {wizardStep === 'ai' && <section className="motion-panel-in space-y-5 rounded-2xl border border-primary/10 bg-ice-blue/55 p-5 sm:p-6">
            <div><p className="text-[10px] font-black uppercase tracking-wider text-coral">Personalização</p><h3 className="mt-1 text-lg font-black text-primary">Como a IA deve construir esta viagem?</h3><p className="mt-1 text-xs text-on-surface/55">Estas escolhas orientam ritmo, linguagem e prioridades do roteiro.</p></div>
            <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1"><span className="text-xs font-semibold">Perfil da viagem</span><select value={formData.profile} onChange={(event) => setFormData((current) => ({ ...current, profile: event.target.value }))} className="w-full rounded-xl border border-outline-variant bg-white p-3 text-xs"><option value="lazer">Lazer e descanso</option><option value="aventura">Aventura</option><option value="cultural">Cultural</option><option value="negocios">Negócios</option></select></label><label className="space-y-1"><span className="text-xs font-semibold">Ritmo desejado</span><select onChange={(event) => setFormData((current) => ({ ...current, preferences: `${current.preferences}\nRitmo: ${event.target.value}`.trim() }))} className="w-full rounded-xl border border-outline-variant bg-white p-3 text-xs"><option value="equilibrado">Equilibrado</option><option value="tranquilo">Tranquilo</option><option value="intenso">Intenso</option></select></label></div>
            <div className="space-y-2"><div className="flex items-center justify-between gap-3"><label htmlFor="trip-preferences" className="text-xs font-semibold">Instruções especiais e tom da escrita</label><button type="button" onClick={handleEnrichPreferences} disabled={enrichingPreferences} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-coral/20 bg-coral/10 px-3 py-2 text-[10px] font-black text-coral transition hover:border-coral/35 hover:bg-coral/15 disabled:opacity-60"><span className={`material-symbols-outlined text-[15px] ${enrichingPreferences ? 'animate-spin' : ''}`}>{enrichingPreferences ? 'progress_activity' : 'auto_fix_high'}</span>{enrichingPreferences ? 'Enriquecendo...' : 'Enriquecer com IA'}</button></div><textarea id="trip-preferences" value={formData.preferences} onChange={(event) => { setFormData((current) => ({ ...current, preferences: event.target.value })); setEnrichedSuggestion(''); }} rows={5} placeholder="Ex.: tom acolhedor, priorizar gastronomia local, evitar escadas..." className="w-full rounded-xl border border-outline-variant bg-white p-3 text-xs" /></div>
            {enrichmentError && <p className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-xs font-semibold text-error">{enrichmentError}</p>}
            {enrichedSuggestion && <div className="space-y-3 rounded-xl border border-primary/15 bg-white p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-wider text-primary">Sugestão enriquecida</p><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">Pronta para revisão</span></div><p className="whitespace-pre-wrap text-xs leading-relaxed text-on-surface/75">{enrichedSuggestion}</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setEnrichedSuggestion('')} className="rounded-lg border border-outline-variant px-3 py-2 text-[10px] font-bold">Descartar</button><button type="button" onClick={() => { setFormData((current) => ({ ...current, preferences: enrichedSuggestion })); setEnrichedSuggestion(''); }} className="rounded-lg bg-primary px-3 py-2 text-[10px] font-bold text-white">Usar este texto</button></div></div>}
            <div className="flex justify-between"><button type="button" onClick={() => goToStep('logistics')} className="rounded-xl border border-outline-variant bg-white px-4 py-3 text-xs font-bold">Voltar</button><button type="button" onClick={() => goToStep('review')} className="rounded-xl bg-primary px-5 py-3 text-xs font-bold text-white">Revisar viagem <span className="material-symbols-outlined ml-1 text-[15px]">arrow_forward</span></button></div>
          </section>}

          {wizardStep === 'review' && <div className="motion-panel-in space-y-6">
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                  Documentos da Viagem
                </h3>
                <p className="text-[11px] text-on-surface opacity-70 mt-1">
                  Anexe vouchers, passagens e PDFs para o viajante visualizar no aplicativo.
                </p>
              </div>

              <label className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary cursor-pointer hover:opacity-95">
                <span className="material-symbols-outlined text-[16px]">attach_file</span>
                Adicionar documentos
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                  className="hidden"
                  onChange={handleDocumentsSelected}
                />
              </label>
            </div>

            {pendingDocuments.length > 0 ? (
              <div className="space-y-2">
                {pendingDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant bg-white px-3 py-2"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary/70">
                        {document.file.type === 'application/pdf' ? 'picture_as_pdf' : 'description'}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-on-surface" title={document.file.name}>
                          {document.file.name}
                        </p>
                        <p className="text-[10px] text-on-surface opacity-60">
                          {(document.file.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemovePendingDocument(document.id)}
                      className="rounded-full p-1 text-red-500 hover:bg-red-50 hover:text-red-700"
                      title="Remover documento"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-outline-variant bg-white px-4 py-6 text-center">
                <span className="material-symbols-outlined text-2xl text-primary/65">folder_open</span>
                <p className="mt-2 text-xs font-semibold text-on-surface">Nenhum documento selecionado ainda.</p>
                <p className="mt-1 text-[11px] text-on-surface opacity-60">
                  Você pode adicionar agora ou depois, dentro da viagem criada.
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-3 rounded-2xl border border-primary/10 bg-white p-5 sm:grid-cols-3"><div><p className="text-[9px] font-black uppercase text-on-surface/40">Período</p><p className="mt-1 text-xs font-bold">{formData.startDate || '—'} a {formData.endDate || '—'}</p></div><div><p className="text-[9px] font-black uppercase text-on-surface/40">Destinos</p><p className="mt-1 text-xs font-bold">{destinations.map((destination) => destination.city.split(' (')[0]).filter(Boolean).join(', ') || '—'}</p></div><div><p className="text-[9px] font-black uppercase text-on-surface/40">Logística</p><p className="mt-1 text-xs font-bold">{transportation.length} transportes · {accommodations.length} hotéis</p></div></div>

          {/* Submit and Cancel */}
          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
            <button
              type="button"
              onClick={saveAndExit}
              disabled={savingDraft}
              className="btn-interactive px-6 py-2.5 border border-outline rounded-lg text-xs font-semibold hover:bg-surface-container transition-colors disabled:opacity-60"
            >
              {savingDraft ? 'Salvando rascunho...' : 'Salvar e continuar depois'}
            </button>
            <button
              disabled={loading}
              type="submit"
              className="btn-interactive px-6 py-2.5 bg-primary text-on-primary font-semibold text-xs rounded-lg hover:opacity-95 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                  {uploadingDocuments ? 'ENVIANDO DOCUMENTOS...' : 'SALVANDO NO BANCO...'}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  {draftTripId ? 'CONCLUIR RASCUNHO' : 'CRIAR VIAGEM'}
                </>
              )}
            </button>
          </div>
          </div>}
        </form>
        </div>
      </div>
    </div>
  );
}
