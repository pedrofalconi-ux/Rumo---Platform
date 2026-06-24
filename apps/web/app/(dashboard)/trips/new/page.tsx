'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Predefined list of popular and requested cities
const CITIES = [
  "Aalborg (DK)",
  "Abbotsford (GB)",
  "Abel Tasman National Park (NZ)",
  "Aberaeron (GB)",
  "Lisboa (PT)",
  "Barcelona (ES)",
  "Londres (GB)",
  "Paris (FR)",
  "Roma (IT)",
  "Milão (IT)",
  "Madrid (ES)",
  "Veneza (IT)",
  "Florença (IT)",
  "Nova York (US)",
  "Tóquio (JP)",
  "Rio de Janeiro (BR)",
  "São Paulo (BR)",
  "Miami (US)",
  "Orlando (US)"
];

interface DestinationEntry {
  city: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  allTravelers: boolean;
}

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

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredCities = CITIES.filter(c => 
    c.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={dropdownRef} className="relative flex-1">
      <div 
        onClick={() => setIsOpen(true)}
        className="border border-outline-variant rounded-lg p-2.5 text-xs flex justify-between items-center cursor-pointer bg-white"
      >
        <span className={value ? "text-on-surface font-semibold" : "text-on-surface opacity-50"}>
          {value || placeholder}
        </span>
        <span className="material-symbols-outlined text-[16px] text-on-surface opacity-75">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-1 w-full bg-white border border-outline-variant rounded-lg shadow-lg overflow-hidden max-h-60 flex flex-col">
          <input
            type="text"
            placeholder="Pesquisar cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="p-2 border-b border-outline-variant text-[11px] outline-none focus:bg-surface-container-low"
            autoFocus
          />
          <div className="overflow-y-auto flex-1 custom-scrollbar text-[11px]">
            {filteredCities.map(city => (
              <div
                key={city}
                onClick={() => {
                  onChange(city);
                  setSearch('');
                  setIsOpen(false);
                }}
                className={`p-2 hover:bg-surface-container cursor-pointer transition-colors ${
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
  const [loading, setLoading] = useState(false);
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
  });

  const [destinations, setDestinations] = useState<DestinationEntry[]>([
    { city: '', startDate: '', endDate: '', allTravelers: true }
  ]);

  const [showGlobalCalendar, setShowGlobalCalendar] = useState(false);
  const [activeDestCalendarIndex, setActiveDestCalendarIndex] = useState<number | null>(null);

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

    try {
      const response = await fetch('/api/trips', {
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
        }),
      });

      if (response.ok) {
        const newTrip = await response.json();
        router.push(`/trips/${newTrip.id}/edit`);
      } else {
        alert('Erro ao criar roteiro no banco de dados.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro de conexão ao banco.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider text-on-surface opacity-75">
        <Link href="/trips" className="hover:text-primary transition-colors">
          Viagens
        </Link>
        <span>/</span>
        <span className="text-primary">Novo Roteiro</span>
      </div>

      <div className="bg-white rounded-xl border border-outline-variant p-8 shadow-sm">
        <h2 className="font-headline-lg text-2xl font-bold text-primary mb-2">Criar Novo Roteiro com Múltiplos Destinos</h2>
        <p className="text-on-surface opacity-75 text-sm mb-6">
          Preencha os dados abaixo. As informações serão salvas permanentemente no banco local.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface opacity-75">Origem *</label>
              <SearchableCitySelect
                value={formData.origin}
                onChange={(val) => setFormData(prev => ({ ...prev, origin: val }))}
                placeholder="Selecione a cidade de origem..."
              />
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
                        placeholder="Ex: Lisboa (PT), Barcelona (ES)..."
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
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-error/10 text-error transition-colors"
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
                className="border border-outline-variant rounded-lg p-2.5 text-xs bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
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
                className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
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
                className="border border-outline-variant rounded-lg p-2.5 text-xs bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
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
                className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
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
              className="border border-outline-variant rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
            />
          </div>

          {/* Submit and Cancel */}
          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
            <Link
              href="/trips"
              className="px-6 py-2.5 border border-outline rounded-lg text-xs font-semibold hover:bg-surface-container transition-colors"
            >
              Cancelar
            </Link>
            <button
              disabled={loading}
              type="submit"
              className="px-6 py-2.5 bg-primary text-on-primary font-semibold text-xs rounded-lg hover:opacity-95 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                  SALVANDO NO BANCO...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  CRIAR NO BANCO
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
