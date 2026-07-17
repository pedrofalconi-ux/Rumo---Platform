import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { CuratedPoi, PoiRetriever, PoiRetrievalRequest, PoiType } from '@rumo/ai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const serverAvailable = Boolean(supabaseUrl && serviceRoleKey);

const supabaseAdmin = serverAvailable
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

type PoiRow = {
  id: string;
  destination_city: string;
  destination_country: string | null;
  name: string;
  provider: 'manual' | 'openstreetmap' | 'official_site';
  provider_record_id: string | null;
  type: PoiType;
  sub_type: string | null;
  description: string | null;
  neighborhood: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  price_range: string | null;
  tags: string[] | null;
  source: string;
  source_ref: string;
  last_verified_at: string;
  manual_overrides: Record<string, unknown> | null;
  partner: boolean;
  featured_rank: number | null;
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function cityFromDestination(destination: string) {
  return destination.split(/[,(]/)[0]?.trim() || destination.trim();
}

function intentTerms(request: PoiRetrievalRequest) {
  return normalize(
    [
      request.dayPlan.theme,
      ...request.dayPlan.focus,
      request.input.profile,
      request.input.preferences,
    ].join(' ')
  ).split(' ').filter((term) => term.length > 2);
}

function scorePoi(row: PoiRow, terms: string[]) {
  const searchable = normalize([
    row.name,
    row.type,
    row.sub_type,
    row.description,
    row.neighborhood,
    ...(row.tags || []),
  ].filter(Boolean).join(' '));
  const editorialBoost = (row.partner ? 8 : 0) + (row.featured_rank != null ? Math.max(0, 5 - row.featured_rank) : 0);
  return editorialBoost + terms.reduce((score, term) => score + (searchable.includes(term) ? 1 : 0), 0);
}

function stringOverride(overrides: Record<string, unknown>, key: string) {
  return typeof overrides[key] === 'string' ? String(overrides[key]).trim() || undefined : undefined;
}

async function mapRow(row: PoiRow): Promise<CuratedPoi> {
  const overrides = row.manual_overrides || {};
  return {
    id: row.id,
    city: row.destination_city,
    country: row.destination_country || undefined,
    name: stringOverride(overrides, 'name') || row.name,
    type: row.type,
    subType: row.sub_type || undefined,
    description: stringOverride(overrides, 'description') || row.description || undefined,
    neighborhood: stringOverride(overrides, 'neighborhood') || row.neighborhood || undefined,
    address: stringOverride(overrides, 'address') || row.address || undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    priceRange: stringOverride(overrides, 'priceRange') || row.price_range || undefined,
    tags: Array.isArray(overrides.tags) ? overrides.tags.map(String) : row.tags || [],
    source: row.source,
    sourceRef: row.source_ref,
    lastVerifiedAt: row.last_verified_at,
    partner: row.partner,
    featuredRank: row.featured_rank ?? undefined,
  };
}

function selectBalancedRows(rows: PoiRow[], terms: string[], limit: number) {
  const ranked = rows
    .map((row) => ({ row, score: scorePoi(row, terms) }))
    .sort((a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name));
  const quotas: Partial<Record<PoiType, number>> = {
    restaurant: 5,
    cafe: 2,
    bar: 1,
    attraction: 4,
    viewpoint: 1,
    park: 1,
    market: 1,
  };
  const selected: PoiRow[] = [];
  const selectedIds = new Set<string>();

  for (const [type, quota] of Object.entries(quotas) as Array<[PoiType, number]>) {
    for (const candidate of ranked.filter(({ row }) => row.type === type).slice(0, quota)) {
      selected.push(candidate.row);
      selectedIds.add(candidate.row.id);
    }
  }
  for (const candidate of ranked) {
    if (selected.length >= limit) break;
    if (!selectedIds.has(candidate.row.id)) selected.push(candidate.row);
  }
  return selected.slice(0, limit);
}

export const supabasePoiRetriever: PoiRetriever = {
  async retrieve(request) {
    const city = cityFromDestination(request.dayPlan.destination);
    if (!supabaseAdmin) {
      return { pois: [], coverage: 'uncovered', normalizedCity: city };
    }

    const { data, error } = await supabaseAdmin
      .from('destination_pois')
      .select('id,destination_city,destination_country,name,provider,provider_record_id,type,sub_type,description,neighborhood,address,latitude,longitude,price_range,tags,source,source_ref,last_verified_at,manual_overrides,partner,featured_rank')
      .ilike('destination_city', city)
      .eq('active', true)
      .eq('curated', true)
      .limit(1000);

    if (error) {
      // Migration ainda nao aplicada e indisponibilidade devem resultar no mesmo
      // comportamento seguro: gerar sem nomes comerciais especificos.
      console.warn(`[poi] Falha ao consultar base curada para ${city}: ${error.message}`);
      return { pois: [], coverage: 'uncovered', normalizedCity: city };
    }

    const terms = intentTerms(request);
    const rows = (data || []) as PoiRow[];
    const pois = selectBalancedRows(rows, terms, request.limit);

    const hydratedPois = await Promise.all(pois.map(mapRow));

    return {
      pois: hydratedPois.filter((poi) => poi.businessStatus !== 'CLOSED_PERMANENTLY'),
      coverage: hydratedPois.length >= 8 ? 'covered' : hydratedPois.length > 0 ? 'partial' : 'uncovered',
      normalizedCity: city,
    };
  },
};
