import { createClient } from '@supabase/supabase-js';
import { db } from '@rumo/db';
import { getAgencyById } from './server-account-store';

type JsonRecord = Record<string, unknown>;

export interface TripRecord extends Record<string, unknown> {
  id: string;
  agencyId: string;
  createdDate: string;
  name: string;
  destinations: string[];
  destinationsDetail?: Array<{
    city: string;
    startDate: string;
    endDate: string;
    allTravelers: boolean;
  }>;
  startDate: string;
  endDate: string;
  travelers: string[];
  status: string;
  clientName: string;
  itinerary: any[];
  origin?: string;
  budget?: number;
  profile?: string;
  preferences?: string;
  coverImage?: string;
  documents?: any[];
  transportation?: any[];
  accommodations?: any[];
  aiStatus?: string;
  aiGenerationId?: string;
  aiGeneratedAt?: string;
  aiPrompt?: any;
  aiResponse?: any;
}

const LOCAL_LEGACY_AGENCY_ID = 'agency-default';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const hasSupabaseServerAccess = Boolean(supabaseUrl && supabaseServiceRoleKey);
const AGENCY_ALIAS_CACHE_TTL_MS = 5 * 60_000;

const agencyAliasCache = new Map<string, { aliases: Set<string>; checkedAt: number }>();

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isPlatformScope(agencyId?: string) {
  return agencyId === 'platform';
}

function canBypassLegacyAgencyCheck() {
  return process.env.NODE_ENV !== 'production' || !process.env.VERCEL;
}

async function resolveAgencyAccessAliases(agencyId?: string) {
  const aliases = new Set<string>();
  if (!agencyId) return aliases;

  const cached = agencyAliasCache.get(agencyId);
  if (cached && Date.now() - cached.checkedAt < AGENCY_ALIAS_CACHE_TTL_MS) {
    return new Set(cached.aliases);
  }

  aliases.add(agencyId);

  if (agencyId === 'agency-default') {
    aliases.add('agency-default');
  }

  try {
    const agency = await getAgencyById(agencyId);
    const legacyAgencyId =
      agency && typeof agency.settings === 'object' && agency.settings
        ? String((agency.settings as JsonRecord).legacyAgencyId || '')
        : '';

    if (legacyAgencyId) {
      aliases.add(legacyAgencyId);
    }
  } catch {
    // Ignore agency alias lookup failures and continue with direct matching only.
  }

  if (!looksLikeUuid(agencyId) && supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin
        .from('agencies')
        .select('id, settings')
        .contains('settings', { legacyAgencyId: agencyId })
        .is('deleted_at', null)
        .limit(5);

      for (const row of data || []) {
        if (row?.id) {
          aliases.add(String(row.id));
        }
      }
    } catch {
      // Ignore reverse alias lookup failures and continue with direct matching only.
    }
  }

  agencyAliasCache.set(agencyId, {
    aliases: new Set(aliases),
    checkedAt: Date.now(),
  });

  return aliases;
}

async function matchesLegacyAgency(currentAgencyId: string | undefined, requestedAgencyId: string) {
  if (!currentAgencyId) return canBypassLegacyAgencyCheck();
  if (
    canBypassLegacyAgencyCheck() ||
    requestedAgencyId === 'platform' ||
    currentAgencyId === requestedAgencyId ||
    currentAgencyId === 'agency-default'
  ) {
    return true;
  }

  const aliases = await resolveAgencyAccessAliases(requestedAgencyId);
  return aliases.has(currentAgencyId);
}

function isLocalLegacyTrip(trip: TripRecord | undefined) {
  return trip?.agencyId === LOCAL_LEGACY_AGENCY_ID;
}

const supabaseAdmin = hasSupabaseServerAccess
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

function formatCreatedDate(isoDate?: string | null) {
  if (!isoDate) {
    return new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
  }

  return new Date(isoDate).toLocaleDateString('pt-BR').replace(/\//g, '-');
}

function normalizeTravelers(travelers: unknown, travelersData: unknown) {
  if (Array.isArray(travelersData) && travelersData.length > 0) {
    return travelersData.map((traveler) => String(traveler));
  }

  const count = Math.max(1, Number(travelers) || 1);
  return Array.from({ length: count }, (_, index) => (index === 0 ? 'DR' : `+${index}`));
}

function mapSupabaseTrip(row: any): TripRecord {
  const content = (row.content || {}) as JsonRecord;
  const metadata = (row.metadata || {}) as JsonRecord;

  return {
    id: row.id,
    agencyId: row.agency_id,
    createdDate: formatCreatedDate(row.created_at),
    name: row.title || 'Viagem',
    destinations: Array.isArray(row.destinations)
      ? row.destinations.map(String)
      : row.destination
        ? [String(row.destination)]
        : [],
    destinationsDetail: Array.isArray(row.destinations_detail)
      ? row.destinations_detail.map((entry: any) => ({
          city: String(entry.city || ''),
          startDate: String(entry.startDate || entry.start_date || ''),
          endDate: String(entry.endDate || entry.end_date || ''),
          allTravelers: entry.allTravelers !== false,
        }))
      : [],
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    travelers: normalizeTravelers(row.travelers, row.travelers_data),
    status: String(row.status || 'Pendente'),
    clientName: String(row.client_name || ''),
    itinerary: Array.isArray(content.items) ? content.items : [],
    origin: row.origin || '',
    budget: row.budget == null ? 0 : Number(row.budget),
    profile: row.profile || '',
    preferences: row.preferences || '',
    coverImage: row.cover_image || '',
    documents: Array.isArray(row.documents) ? row.documents : [],
    transportation: Array.isArray(row.transportation) ? row.transportation : [],
    accommodations: Array.isArray(row.accommodations) ? row.accommodations : [],
    aiStatus: row.ai_status || 'NONE',
    aiGenerationId: row.ai_generation_id || undefined,
    aiGeneratedAt: row.ai_generated_at || undefined,
    aiPrompt: row.ai_prompt || null,
    aiResponse: row.ai_response || null,
    ...metadata,
  };
}

function buildSupabaseTripPayload(input: Partial<TripRecord>, agencyId: string, userId?: string) {
  const destinations = Array.isArray(input.destinations)
    ? input.destinations.map(String).filter(Boolean)
    : [];
  const travelers = Array.isArray(input.travelers) ? input.travelers.map(String) : [];

  return {
    agency_id: agencyId,
    agent_id: userId || null,
    title: String(input.name || 'Nova viagem'),
    client_name: String(input.clientName || ''),
    destination: destinations[0] || '',
    destinations,
    destinations_detail: Array.isArray(input.destinationsDetail) ? input.destinationsDetail : [],
    origin: String(input.origin || ''),
    start_date: String(input.startDate || ''),
    end_date: String(input.endDate || ''),
    travelers: Math.max(1, travelers.length || 1),
    travelers_data: travelers,
    budget: Number(input.budget || 0),
    currency: 'BRL',
    status: String(input.status || 'Pendente'),
    profile: input.profile ? String(input.profile) : null,
    preferences: input.preferences ? String(input.preferences) : '',
    cover_image: input.coverImage ? String(input.coverImage) : null,
    documents: Array.isArray(input.documents) ? input.documents : [],
    transportation: Array.isArray(input.transportation) ? input.transportation : [],
    accommodations: Array.isArray(input.accommodations) ? input.accommodations : [],
    ai_status: input.aiStatus ? String(input.aiStatus) : 'NONE',
    ai_generation_id: input.aiGenerationId || null,
    ai_generated_at: input.aiGeneratedAt || null,
    ai_prompt: input.aiPrompt || null,
    ai_response: input.aiResponse || null,
    content: {
      items: Array.isArray(input.itinerary) ? input.itinerary : [],
    },
    metadata: {},
  };
}

export async function listTripsForAgency(agencyId: string) {
  const aliases = await resolveAgencyAccessAliases(agencyId);
  const scopedLegacyTrips = () =>
    (db.trips.findMany() as TripRecord[]).filter((trip) =>
      isPlatformScope(agencyId) ? true : aliases.has(trip.agencyId)
    );

  if (!supabaseAdmin) {
    return scopedLegacyTrips();
  }

  let query = supabaseAdmin
    .from('itineraries')
    .select(
      'id, agency_id, created_at, title, destination, destinations, destinations_detail, start_date, end_date, travelers, travelers_data, status, client_name'
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (!isPlatformScope(agencyId)) {
    const supabaseAgencyIds = Array.from(aliases).filter(looksLikeUuid);
    if (supabaseAgencyIds.length === 1) {
      query = query.eq('agency_id', supabaseAgencyIds[0]);
    } else if (supabaseAgencyIds.length > 1) {
      query = query.in('agency_id', supabaseAgencyIds);
    } else {
      query = query.eq('agency_id', agencyId);
    }
  }

  const { data, error } = await query;

  if (error) {
    return scopedLegacyTrips();
  }

  const supabaseTrips = (data || []).map(mapSupabaseTrip);
  const legacyTrips = scopedLegacyTrips().filter(
    (trip) => !supabaseTrips.some((supabaseTrip) => supabaseTrip.id === trip.id)
  );

  return [...supabaseTrips, ...legacyTrips];
}

export async function findTripById(id: string, agencyId?: string) {
  const isUuid = looksLikeUuid(id);

  if (!supabaseAdmin || !isUuid) {
    const trip = db.trips.findOne(id) as TripRecord | undefined;
    if (!trip) return null;
    if (agencyId && !(await matchesLegacyAgency(trip.agencyId, agencyId))) return null;
    return trip;
  }

  const { data, error } = await supabaseAdmin
    .from('itineraries')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();

  if (!error && data) {
    const mapped = mapSupabaseTrip(data);
    if (!agencyId || mapped.agencyId === agencyId || (await matchesLegacyAgency(mapped.agencyId, agencyId))) {
      return mapped;
    }
  }

  if (error || !data) {
    const trip = db.trips.findOne(id) as TripRecord | undefined;
    if (!trip) return null;
    if (agencyId && !(await matchesLegacyAgency(trip.agencyId, agencyId))) return null;
    return trip;
  }

  return null;
}

export async function createTripForAgency(input: Partial<TripRecord>, agencyId: string, userId?: string) {
  if (!supabaseAdmin) {
    return db.trips.create({ ...input, agencyId }) as TripRecord;
  }

  const payload = buildSupabaseTripPayload(input, agencyId, userId);
  const { data, error } = await supabaseAdmin.from('itineraries').insert(payload).select('*').single();
  if (error || !data) {
    return db.trips.create({ ...input, agencyId }) as TripRecord;
  }

  return mapSupabaseTrip(data);
}

export async function updateTripForAgency(id: string, patch: Partial<TripRecord>, agencyId: string, userId?: string) {
  const isUuid = looksLikeUuid(id);

  if (!supabaseAdmin || !isUuid) {
    const current = db.trips.findOne(id) as TripRecord | undefined;
    if (!current) return null;
    if (!isLocalLegacyTrip(current) && !(await matchesLegacyAgency(current.agencyId, agencyId))) return null;
    return db.trips.update(id, patch) as TripRecord;
  }

  const current = await findTripById(id, agencyId);
  if (!current) return null;
  // O usuario pode acessar o tenant por um alias legado. Depois de autorizar o
  // acesso acima, toda escrita deve usar o agency_id realmente persistido na
  // viagem; filtrar pelo alias faz o UPDATE afetar zero linhas.
  const persistedAgencyId = current.agencyId;

  const payload = buildSupabaseTripPayload(
    {
      ...current,
      ...patch,
      itinerary: patch.itinerary || current.itinerary,
      travelers: patch.travelers || current.travelers,
      destinations: patch.destinations || current.destinations,
      destinationsDetail: patch.destinationsDetail || current.destinationsDetail,
      documents: patch.documents || current.documents,
      transportation: patch.transportation || current.transportation,
      accommodations: patch.accommodations || current.accommodations,
    },
    persistedAgencyId,
    userId
  );

  const updateQuery = supabaseAdmin.from('itineraries').update(payload).eq('id', id);
  const scopedUpdateQuery = isPlatformScope(agencyId)
    ? updateQuery
    : updateQuery.eq('agency_id', persistedAgencyId);

  const { data, error } = await scopedUpdateQuery.select('*').single();

  if (error || !data) {
    console.error('[trips] Falha ao atualizar itinerario no Supabase', {
      tripId: id,
      requestedAgencyId: agencyId,
      persistedAgencyId,
      error: error?.message || 'UPDATE nao retornou dados',
    });
    const legacyCurrent = db.trips.findOne(id) as TripRecord | undefined;
    if (!legacyCurrent) return null;
    if (!isLocalLegacyTrip(legacyCurrent) && !(await matchesLegacyAgency(legacyCurrent.agencyId, agencyId))) {
      return null;
    }
    return db.trips.update(id, patch) as TripRecord;
  }

  return mapSupabaseTrip(data);
}

export async function deleteTripForAgency(id: string, agencyId: string) {
  const isUuid = looksLikeUuid(id);

  if (!supabaseAdmin || !isUuid) {
    const current = db.trips.findOne(id) as TripRecord | undefined;
    if (!current || !(await matchesLegacyAgency(current.agencyId, agencyId))) return false;
    return db.trips.delete(id);
  }

  const scopedQuery = supabaseAdmin
    .from('itineraries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  const { error } = isPlatformScope(agencyId)
    ? await scopedQuery
    : await scopedQuery.eq('agency_id', agencyId);

  if (error) {
    const current = db.trips.findOne(id) as TripRecord | undefined;
    if (!current || !(await matchesLegacyAgency(current.agencyId, agencyId))) return false;
    return db.trips.delete(id);
  }

  return true;
}
