import { createClient } from '@supabase/supabase-js';
import { db } from '@rumo/db';

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
  aiStatus?: string;
  aiGenerationId?: string;
  aiGeneratedAt?: string;
  aiPrompt?: any;
  aiResponse?: any;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const hasSupabaseServerAccess = Boolean(supabaseUrl && supabaseServiceRoleKey);
const SUPABASE_SERVER_TIMEOUT_MS = 1200;
const TABLE_CACHE_TTL_MS = 30_000;

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

export async function listTripsForAgency(agencyId: string) {
  if (!supabaseAdmin || !(await isTableReady('itineraries'))) {
    return db.trips.findMany(agencyId) as TripRecord[];
  }

  const { data, error } = await supabaseAdmin
    .from('itineraries')
    .select('*')
    .eq('agency_id', agencyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return db.trips.findMany(agencyId) as TripRecord[];
  }

  return (data || []).map(mapSupabaseTrip);
}

export async function findTripById(id: string, agencyId?: string) {
  if (!supabaseAdmin || !(await isTableReady('itineraries'))) {
    const trip = db.trips.findOne(id) as TripRecord | undefined;
    if (!trip) return null;
    if (agencyId && trip.agencyId !== agencyId) return null;
    return trip;
  }

  let query = supabaseAdmin.from('itineraries').select('*').eq('id', id).is('deleted_at', null).limit(1);
  if (agencyId) {
    query = query.eq('agency_id', agencyId);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) {
    const trip = db.trips.findOne(id) as TripRecord | undefined;
    if (!trip) return null;
    if (agencyId && trip.agencyId !== agencyId) return null;
    return trip;
  }

  return mapSupabaseTrip(data);
}

export async function createTripForAgency(input: Partial<TripRecord>, agencyId: string, userId?: string) {
  if (!supabaseAdmin || !(await isTableReady('itineraries'))) {
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
  if (!supabaseAdmin || !(await isTableReady('itineraries'))) {
    const current = db.trips.findOne(id) as TripRecord | undefined;
    if (!current || current.agencyId !== agencyId) return null;
    return db.trips.update(id, patch) as TripRecord;
  }

  const current = await findTripById(id, agencyId);
  if (!current) return null;

  const payload = buildSupabaseTripPayload(
    {
      ...current,
      ...patch,
      itinerary: patch.itinerary || current.itinerary,
      travelers: patch.travelers || current.travelers,
      destinations: patch.destinations || current.destinations,
      destinationsDetail: patch.destinationsDetail || current.destinationsDetail,
      documents: patch.documents || current.documents,
    },
    agencyId,
    userId
  );

  const { data, error } = await supabaseAdmin
    .from('itineraries')
    .update(payload)
    .eq('id', id)
    .eq('agency_id', agencyId)
    .select('*')
    .single();

  if (error || !data) {
    const legacyCurrent = db.trips.findOne(id) as TripRecord | undefined;
    if (!legacyCurrent || legacyCurrent.agencyId !== agencyId) return null;
    return db.trips.update(id, patch) as TripRecord;
  }

  return mapSupabaseTrip(data);
}

export async function deleteTripForAgency(id: string, agencyId: string) {
  if (!supabaseAdmin || !(await isTableReady('itineraries'))) {
    const current = db.trips.findOne(id) as TripRecord | undefined;
    if (!current || current.agencyId !== agencyId) return false;
    return db.trips.delete(id);
  }

  const { error } = await supabaseAdmin
    .from('itineraries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('agency_id', agencyId);

  if (error) {
    const current = db.trips.findOne(id) as TripRecord | undefined;
    if (!current || current.agencyId !== agencyId) return false;
    return db.trips.delete(id);
  }

  return true;
}
