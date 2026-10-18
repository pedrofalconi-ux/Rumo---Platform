'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  canUseLocalTripFallback,
  isProductionPersistenceError,
  mergeTripsById,
  readLocalTrips,
  removeLocalTrip,
} from '../../../lib/trip-local-store';

interface Trip {
  id: string;
  createdDate: string;
  name: string;
  destinations: string[];
  startDate: string;
  endDate: string;
  travelers: string[];
  status: 'Rascunho' | 'Publicado' | 'Pendente' | 'Cancelado' | 'Confirmado';
  clientName: string;
  wizardDraft?: { formData?: { startDate?: string; endDate?: string } };
}

interface ItineraryReference {
  id: string;
  title: string;
  destinations: string[];
  status: string;
  itemCount: number;
}

type SortField = 'createdDate' | 'name';
type SortDirection = 'asc' | 'desc';
const TRIPS_PER_PAGE = 10;

function createdDateTimestamp(value: string) {
  const brazilianDate = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());
  if (brazilianDate) {
    const [, day, month, year] = brazilianDate;
    return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
  }
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export default function TripsPage() {
  const browserFallbackEnabled = canUseLocalTripFallback();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [viewFilter, setViewFilter] = useState<'all' | 'ai'>('all');
  const [contextReferences, setContextReferences] = useState<ItineraryReference[]>([]);
  const [sortField, setSortField] = useState<SortField>('createdDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const contextRequest = fetch('/api/ai/context/itineraries').catch(() => null);
      const response = await fetch('/api/trips');
      const localTrips = readLocalTrips<Trip>().map((trip) => ({
        id: trip.id,
        createdDate: trip.createdDate,
        name: trip.name,
        destinations: Array.isArray(trip.destinations) ? trip.destinations : [],
        startDate: trip.startDate,
        endDate: trip.endDate,
        travelers: Array.isArray(trip.travelers) ? trip.travelers : [],
        status: trip.status,
        clientName: trip.clientName,
        wizardDraft: trip.wizardDraft
          ? {
              formData: {
                startDate: trip.wizardDraft.formData?.startDate,
                endDate: trip.wizardDraft.formData?.endDate,
              },
            }
          : undefined,
      }));
      if (response.ok) {
        const data = await response.json();
        const mergedTrips = mergeTripsById(data, localTrips);
        setTrips(mergedTrips);
      } else {
        setTrips(localTrips);
      }
      setLoading(false);

      const contextResponse = await contextRequest;
      if (contextResponse?.ok) {
        const contextData = await contextResponse.json();
        setContextReferences(Array.isArray(contextData.references) ? contextData.references : []);
      } else {
        setContextReferences([]);
      }
    } catch (error) {
      console.error('Erro ao buscar viagens:', error);
      setTrips(readLocalTrips<Trip>());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const requestedStatus = searchParams.get('status');
    const requestedSearch = searchParams.get('q');
    queueMicrotask(() => {
      if (requestedStatus) setStatusFilter(requestedStatus);
      if (requestedSearch) setSearchTerm(requestedSearch);
      void fetchTrips();
    });
  }, []);

  const handleDeleteTrip = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta viagem?')) return;
    try {
      const response = await fetch(`/api/trips/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchTrips();
      } else {
        const data = await response.json().catch(() => ({}));
        if (browserFallbackEnabled && isProductionPersistenceError(String(data.error || ''))) {
          removeLocalTrip(id);
          fetchTrips();
          return;
        }
        alert(data.error || 'Erro ao excluir viagem.');
      }
    } catch (error) {
      console.error(error);
      if (browserFallbackEnabled) {
        removeLocalTrip(id);
        fetchTrips();
      }
    }
  };

  const filteredTrips = trips.filter((trip) => {
    const matchesSearch =
      trip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (trip.clientName && trip.clientName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'Todos' || trip.status === statusFilter;
    const matchesView = viewFilter === 'all' || contextReferences.some((reference) => reference.id === trip.id);

    return matchesSearch && matchesStatus && matchesView;
  }).sort((first, second) => {
    const comparison = sortField === 'name'
      ? first.name.localeCompare(second.name, 'pt-BR', { sensitivity: 'base' })
      : createdDateTimestamp(first.createdDate) - createdDateTimestamp(second.createdDate);
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: SortField) => {
    setCurrentPage(1);
    if (sortField === field) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortField(field);
    setSortDirection('asc');
  };

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return 'unfold_more';
    return sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward';
  };

  const totalPages = Math.ceil(filteredTrips.length / TRIPS_PER_PAGE);
  const safeCurrentPage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;
  const paginatedTrips = filteredTrips.slice(
    (safeCurrentPage - 1) * TRIPS_PER_PAGE,
    safeCurrentPage * TRIPS_PER_PAGE
  );
  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) =>
    totalPages <= 7 || page === 1 || page === totalPages || Math.abs(page - safeCurrentPage) <= 1
  );

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('Todos');
    setViewFilter('all');
    setCurrentPage(1);
  };

  const getStatusBadgeClass = (status: Trip['status']) => {
    switch (status) {
      case 'Publicado':
        return 'bg-status-active text-success border border-success/20';
      case 'Confirmado':
        return 'bg-status-confirmed text-success border border-success/30';
      case 'Pendente':
        return 'bg-slate-100 text-slate-600 border border-slate-200';
      case 'Rascunho':
        return 'bg-primary/10 text-primary border border-primary/20';
      case 'Cancelado':
        return 'bg-status-cancelled text-error border border-error/20';
      default:
        return 'bg-status-draft text-primary border border-primary/20';
    }
  };

  return (
    <div className="flex-1">
      {/* Header Section */}
      <div className="page-heading scroll-reveal flex flex-col sm:flex-row gap-4 sm:items-end justify-between mb-8">
        <div>
          <h2 className="font-headline-lg text-3xl font-bold tracking-[-.035em] text-on-surface">Itinerários</h2>
          <p className="mt-1 text-sm text-on-surface/60">
            Crie, revise e publique experiências completas para seus viajantes.
          </p>
        </div>
        <Link
          href="/trips/new"
          className="ui-btn ui-btn-primary w-full shrink-0 sm:w-auto"
        >
          <span className="material-symbols-outlined text-[17px]">add</span>
          Criar nova viagem
        </Link>
      </div>

      <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-outline-variant bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ice-blue text-primary"><span className="material-symbols-outlined text-[20px]">auto_awesome</span></span>
          <div><h3 className="text-sm font-semibold">A IA aprende com o repertório da sua agência</h3><p className="mt-1 max-w-2xl text-xs leading-relaxed text-on-surface/52">{contextReferences.length ? `${contextReferences.length} itinerário${contextReferences.length > 1 ? 's' : ''} com conteúdo já pode${contextReferences.length > 1 ? 'm' : ''} ser usado${contextReferences.length > 1 ? 's' : ''} como referência de estilo, ritmo e sequência.` : 'Assim que um itinerário tiver conteúdo, ele poderá orientar novas criações da própria agência.'}</p></div>
        </div>
        <button type="button" onClick={() => { setViewFilter((current) => current === 'ai' ? 'all' : 'ai'); setCurrentPage(1); }} className={`ui-btn shrink-0 ${viewFilter === 'ai' ? 'ui-btn-primary' : 'ui-btn-secondary'}`}>
          <span className="material-symbols-outlined text-[17px]">database</span>
          {viewFilter === 'ai' ? 'Ver todos' : 'Ver referências da IA'}
        </button>
      </section>

      {/* Filtros disponíveis */}
      <div className="scroll-reveal scroll-reveal-delay-50 mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-outline-variant bg-white p-5 md:grid-cols-[minmax(0,2fr)_minmax(180px,1fr)_auto]">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface/65">Buscar itinerário</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface opacity-60 text-[20px]">
              search
            </span>
            <input
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full border border-outline-variant rounded-lg py-2 pl-10 pr-3 text-xs bg-surface-container-lowest focus:ring-1 focus:ring-primary outline-none"
              placeholder="Nome do roteiro ou cliente"
              type="text"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface/65">Status</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface opacity-60 text-[20px]">
              flag
            </span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full border border-outline-variant rounded-lg py-2 pl-10 pr-3 text-xs bg-surface-container-lowest appearance-none outline-none"
            >
              <option value="Todos">Todos os status</option>
              <option value="Rascunho">Rascunhos</option>
              <option value="Publicado">Publicado</option>
              <option value="Confirmado">Confirmado</option>
              <option value="Pendente">Pendente</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
        </div>

        <div className="flex items-end">
          <button
            onClick={clearFilters}
            className="ui-btn ui-btn-secondary w-full"
          >
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            Limpar filtros
          </button>
        </div>
      </div>

      {/* Robust Data Table */}
      <div className="scroll-reveal scroll-reveal-delay-100 overflow-hidden rounded-2xl border border-outline-variant bg-white">
        {loading ? (
          <div className="px-6 py-12 text-center text-on-surface opacity-65 text-sm flex items-center justify-center gap-2">
            <span className="material-symbols-outlined animate-spin">sync</span>
            <span>Carregando viagens do banco de dados...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th aria-sort={sortField === 'createdDate' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-6 py-4 font-semibold text-xs text-on-surface opacity-70 uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('createdDate')} className="flex items-center gap-2 hover:text-primary" title="Ordenar por data de criação">
                      Criado em
                      <span className="material-symbols-outlined text-[14px]">{sortIcon('createdDate')}</span>
                    </button>
                  </th>
                  <th aria-sort={sortField === 'name' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-6 py-4 font-semibold text-xs text-on-surface opacity-70 uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('name')} className="flex items-center gap-2 hover:text-primary" title="Ordenar por nome da viagem">
                      Itinerário
                      <span className="material-symbols-outlined text-[14px]">{sortIcon('name')}</span>
                    </button>
                  </th>
                  <th className="px-6 py-4 font-semibold text-xs text-on-surface opacity-70 uppercase tracking-wider">
                    Destinos
                  </th>
                  <th className="px-6 py-4 font-semibold text-xs text-on-surface opacity-70 uppercase tracking-wider">
                    Datas
                  </th>
                  <th className="px-6 py-4 font-semibold text-xs text-on-surface opacity-70 uppercase tracking-wider">
                    Viajantes
                  </th>
                  <th className="px-6 py-4 font-semibold text-xs text-on-surface opacity-70 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {paginatedTrips.map((trip) => (
                  <tr
                    key={trip.id}
                    className="table-row-hover transition-all duration-150 hover:bg-surface-container-low"
                  >
                    <td className="px-6 py-4 text-xs font-mono font-medium text-on-surface opacity-80">
                      {trip.createdDate}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={trip.status === 'Rascunho' ? `/trips/new?draft=${trip.id}` : `/trips/${trip.id}/edit`}
                        className="font-semibold text-sm text-on-surface hover:text-primary transition-colors block"
                      >
                        {trip.name}
                      </Link>
                      {contextReferences.some((reference) => reference.id === trip.id) && <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-primary"><span className="material-symbols-outlined text-[13px]">auto_awesome</span>Referência da IA</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {trip.destinations.map((dest) => (
                          <span
                            key={dest}
                            className="bg-surface-container px-2 py-0.5 rounded text-[11px] font-medium"
                          >
                            {dest}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-on-surface opacity-80">
                      {trip.status === 'Rascunho' && (!trip.wizardDraft?.formData?.startDate || !trip.wizardDraft?.formData?.endDate) ? 'Datas a definir' : <>{trip.startDate} <span className="text-outline mx-1">•</span> {trip.endDate}</>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {(trip.travelers || ['R']).map((t, idx) => (
                            <div
                              key={idx}
                              className="w-8 h-8 rounded-full border-2 border-white bg-primary-container text-white flex items-center justify-center text-[10px] font-bold"
                            >
                              {t}
                            </div>
                          ))}
                        </div>
                        <span className="text-xs text-on-surface opacity-80">{trip.clientName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusBadgeClass(
                          trip.status
                        )}`}
                      >
                        {trip.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex gap-1 justify-end items-center">
                      <button
                        onClick={() => handleDeleteTrip(trip.id)}
                        className="ui-icon-btn border-transparent text-error hover:border-error/15 hover:bg-error/5 hover:text-error"
                        title="Excluir"
                        aria-label={`Excluir ${trip.name}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                      <Link
                        href={trip.status === 'Rascunho' ? `/trips/new?draft=${trip.id}` : `/trips/${trip.id}/edit`}
                        className="ui-icon-btn"
                        title={trip.status === 'Rascunho' ? 'Continuar preenchimento' : 'Editar'}
                        aria-label={trip.status === 'Rascunho' ? `Continuar ${trip.name}` : `Editar ${trip.name}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{trip.status === 'Rascunho' ? 'play_arrow' : 'edit'}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
                {filteredTrips.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-on-surface opacity-65 text-sm">
                      Nenhum itinerário encontrado para os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="px-6 py-4 bg-surface-container-low flex justify-between items-center border-t border-outline-variant">
          <p className="text-xs text-on-surface opacity-75">
            Mostrando {paginatedTrips.length} de {filteredTrips.length} itinerários
          </p>
          {totalPages > 0 && <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="btn-interactive p-1 hover:bg-surface-container-high rounded border border-outline-variant transition-colors disabled:opacity-30"
              disabled={safeCurrentPage === 1}
              aria-label="Página anterior"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <div className="flex items-center gap-1">
              {visiblePages.map((page, index) => <React.Fragment key={page}>
                {index > 0 && page - visiblePages[index - 1] > 1 && <span className="px-1 text-on-surface opacity-60">...</span>}
                <button type="button" onClick={() => setCurrentPage(page)} aria-current={page === safeCurrentPage ? 'page' : undefined} className={`btn-interactive w-8 h-8 rounded text-xs ${page === safeCurrentPage ? 'bg-primary text-on-primary font-bold' : 'hover:bg-surface-container-high'}`}>{page}</button>
              </React.Fragment>)}
            </div>
            <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage === totalPages} aria-label="Próxima página" className="btn-interactive p-1 hover:bg-surface-container-high rounded border border-outline-variant transition-colors disabled:opacity-30">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>}
        </div>
      </div>
    </div>
  );
}
