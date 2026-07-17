#!/usr/bin/env node

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const CITIES = {
  roma: { name: 'Roma', country: 'Italia', bbox: [41.6559, 12.2344, 42.1412, 12.8558] },
  paris: { name: 'Paris', country: 'Franca', bbox: [48.8156, 2.2241, 48.9022, 2.4699] },
  lisboa: { name: 'Lisboa', country: 'Portugal', bbox: [38.6914, -9.2302, 38.7968, -9.0863] },
  // Inclui Orlando, Lake Buena Vista e o eixo dos parques, que fazem parte do
  // destino turistico vendido como "Orlando", embora cruzem limites municipais.
  orlando: { name: 'Orlando', country: 'Estados Unidos', bbox: [28.30, -81.66, 28.62, -81.20] },
  // Destinos brasileiros prioritarios. Os limites incluem os principais eixos
  // turisticos, inclusive quando o destino comercial nao coincide com o municipio.
  riodejaneiro: { name: 'Rio de Janeiro', country: 'Brasil', bbox: [-23.083, -43.797, -22.746, -43.099] },
  saopaulo: { name: 'São Paulo', country: 'Brasil', bbox: [-24.008, -46.826, -23.357, -46.365] },
  salvador: { name: 'Salvador', country: 'Brasil', bbox: [-13.130, -38.720, -12.790, -38.300] },
  portoseguro: { name: 'Porto Seguro', country: 'Brasil', bbox: [-16.550, -39.300, -16.250, -39.000] },
  maceio: { name: 'Maceió', country: 'Brasil', bbox: [-9.750, -35.830, -9.470, -35.620] },
  recife: { name: 'Recife', country: 'Brasil', bbox: [-8.170, -35.020, -7.930, -34.830] },
  portodegalinhas: { name: 'Porto de Galinhas', country: 'Brasil', bbox: [-8.570, -35.080, -8.420, -34.940] },
  praiadoforte: { name: 'Praia do Forte', country: 'Brasil', bbox: [-12.620, -38.090, -12.520, -37.970] },
  fortaleza: { name: 'Fortaleza', country: 'Brasil', bbox: [-3.890, -38.690, -3.680, -38.390] },
  natal: { name: 'Natal', country: 'Brasil', bbox: [-5.920, -35.320, -5.690, -35.150] },
  joaopessoa: { name: 'João Pessoa', country: 'Brasil', bbox: [-7.250, -34.980, -6.960, -34.790] },
  fozdoiguacu: { name: 'Foz do Iguaçu', country: 'Brasil', bbox: [-25.660, -54.680, -25.390, -54.350] },
  florianopolis: { name: 'Florianópolis', country: 'Brasil', bbox: [-27.860, -48.680, -27.370, -48.350] },
  gramado: { name: 'Gramado', country: 'Brasil', bbox: [-29.430, -50.950, -29.300, -50.790] },
  buzios: { name: 'Búzios', country: 'Brasil', bbox: [-22.830, -42.130, -22.690, -41.860] },
};

const args = new Set(process.argv.slice(2));
const cityArg = process.argv.find((value) => value.startsWith('--city='))?.split('=')[1]?.toLowerCase();
const city = cityArg ? CITIES[cityArg] : undefined;
const apply = args.has('--apply');
const activate = args.has('--activate');
const endpoints = process.env.OVERPASS_API_URL
  ? [process.env.OVERPASS_API_URL]
  : [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.private.coffee/api/interpreter',
    ];

if (!city) {
  console.error(`Uso: node scripts/import-overpass-pois.mjs --city=${Object.keys(CITIES).join('|')} [--apply] [--activate]`);
  process.exit(1);
}

for (const file of ['.env', 'apps/web/.env.local']) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 1) continue;
    const key = line.slice(0, index);
    if (!process.env[key]) process.env[key] = line.slice(index + 1).replace(/^['"]|['"]$/g, '');
  }
}

function buildQuery([south, west, north, east]) {
  const bbox = `${south},${west},${north},${east}`;
  return `[out:json][timeout:120][maxsize:268435456];
(
  nwr["amenity"~"^(restaurant|cafe|bar|pub|marketplace)$"]["name"](${bbox});
  nwr["tourism"~"^(attraction|museum|gallery|viewpoint)$"]["name"](${bbox});
  nwr["leisure"="park"]["name"](${bbox});
);
out center tags;`;
}

function mapType(tags) {
  if (tags.amenity === 'restaurant') return 'restaurant';
  if (tags.amenity === 'cafe') return 'cafe';
  if (tags.amenity === 'bar' || tags.amenity === 'pub') return 'bar';
  if (tags.amenity === 'marketplace') return 'market';
  if (tags.tourism === 'viewpoint') return 'viewpoint';
  if (tags.leisure === 'park') return 'park';
  return 'attraction';
}

function addressFrom(tags) {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  return [street, tags['addr:suburb'], tags['addr:city'], tags['addr:postcode']].filter(Boolean).join(', ') || null;
}

function descriptionFrom(tags) {
  const parts = [];
  if (tags.cuisine) parts.push(`Culinaria: ${tags.cuisine.split(';').join(', ')}`);
  if (tags.opening_hours) parts.push(`Horario informado no OSM: ${tags.opening_hours}`);
  if (tags.website || tags['contact:website']) parts.push('Possui site informado no OpenStreetMap');
  return parts.join('. ') || null;
}

function tagsFrom(element) {
  const tags = element.tags || {};
  return [tags.cuisine, tags.tourism, tags.amenity, tags.leisure]
    .filter(Boolean)
    .flatMap((value) => String(value).split(';'))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function mapElement(element) {
  const tags = element.tags || {};
  const latitude = element.lat ?? element.center?.lat ?? null;
  const longitude = element.lon ?? element.center?.lon ?? null;
  const recordId = `${element.type}/${element.id}`;
  return {
    destination_city: city.name,
    destination_country: city.country,
    name: tags.name,
    provider: 'openstreetmap',
    provider_record_id: recordId,
    type: mapType(tags),
    sub_type: tags.cuisine || tags.tourism || tags.amenity || tags.leisure || null,
    description: descriptionFrom(tags),
    neighborhood: tags['addr:suburb'] || tags['addr:district'] || tags['addr:quarter'] || null,
    address: addressFrom(tags),
    latitude,
    longitude,
    price_range: null,
    tags: tagsFrom(element),
    source: 'OpenStreetMap contributors (ODbL)',
    source_ref: `https://www.openstreetmap.org/${recordId}`,
    manual_overrides: {},
    partner: false,
    featured_rank: null,
    curated: activate,
    active: activate,
    last_verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

const TYPE_LIMITS = {
  restaurant: 220,
  cafe: 140,
  bar: 90,
  attraction: 140,
  viewpoint: 50,
  park: 90,
  market: 60,
};

function qualityScore(element) {
  const tags = element.tags || {};
  const hasStreetAddress = Boolean(tags['addr:street'] || tags['addr:full']);
  const hasWebsite = Boolean(tags.website || tags['contact:website']);
  const hasContact = Boolean(tags.phone || tags['contact:phone']);
  return (
    (hasStreetAddress ? 3 : 0) +
    (hasWebsite ? 3 : 0) +
    (tags.opening_hours ? 2 : 0) +
    (tags.cuisine ? 2 : 0) +
    (tags.wikidata ? 5 : 0) +
    (tags.wikipedia ? 4 : 0) +
    (hasContact ? 1 : 0) +
    (tags.description ? 1 : 0)
  );
}

function selectQualityCandidates(elements) {
  const grouped = new Map();
  const seenNames = new Set();
  for (const element of elements) {
    if (!element.tags?.name || (element.lat == null && element.center?.lat == null)) continue;
    const rawTags = element.tags || {};
    const normalizedName = String(rawTags.name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if (/\b(closed|encerrad[oa]|fechad[oa])\b/i.test(normalizedName)) continue;
    if (rawTags.disused === 'yes' || rawTags.abandoned === 'yes' || rawTags['disused:amenity'] || rawTags['abandoned:amenity']) continue;
    const type = mapType(element.tags);
    const score = qualityScore(element);
    // Gastronomia sem nenhum dado adicional tende a produzir muitos registros
    // desatualizados. Atracoes com nome e coordenadas continuam uteis mesmo sem contato.
    if (['restaurant', 'cafe', 'bar'].includes(type) && score < 2) continue;
    const list = grouped.get(type) || [];
    list.push({ element, score });
    grouped.set(type, list);
  }

  return Array.from(grouped.entries()).flatMap(([type, candidates]) =>
    candidates
      .sort((a, b) => b.score - a.score || String(a.element.tags.name).localeCompare(String(b.element.tags.name)))
      .filter(({ element }) => {
        const key = String(element.tags.name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        if (seenNames.has(key)) return false;
        seenNames.add(key);
        return true;
      })
      .slice(0, TYPE_LIMITS[type] || 100)
      .map(({ element }) => element)
  );
}

async function download() {
  const errors = [];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'Rumo-POI-Importer/1.0 (development; contact: platform owner)',
        },
        body: new URLSearchParams({ data: buildQuery(city.bbox) }),
        signal: AbortSignal.timeout(150_000),
      });
      if (response.ok) return response.json();
      errors.push(`${endpoint}: HTTP ${response.status}`);
    } catch (error) {
      errors.push(`${endpoint}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`Nenhum servidor Overpass respondeu para ${city.name}: ${errors.join('; ')}`);
}

async function persist(rows) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias para --apply');
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: existing, error: readError } = await supabase
    .from('destination_pois')
    .select('id,provider_record_id')
    .eq('provider', 'openstreetmap')
    .eq('destination_city', city.name)
    .limit(5000);
  if (readError) throw new Error(`Supabase: ${readError.message}`);

  const existingByProviderId = new Map((existing || []).map((row) => [row.provider_record_id, row.id]));
  const inserts = rows.filter((row) => !existingByProviderId.has(row.provider_record_id));
  const updates = rows
    .filter((row) => existingByProviderId.has(row.provider_record_id))
    .map((row) => {
      // Campos editoriais pertencem a curadoria e nao devem ser sobrescritos
      // quando o mesmo registro for sincronizado novamente.
      const { manual_overrides, partner, featured_rank, curated, active, ...providerFields } = row;
      return { ...providerFields, id: existingByProviderId.get(row.provider_record_id) };
    });

  for (let index = 0; index < inserts.length; index += 250) {
    const { error } = await supabase.from('destination_pois').insert(inserts.slice(index, index + 250));
    if (error) throw new Error(`Supabase insert: ${error.message}`);
  }
  for (let index = 0; index < updates.length; index += 250) {
    const { error } = await supabase.from('destination_pois').upsert(updates.slice(index, index + 250), { onConflict: 'id' });
    if (error) throw new Error(`Supabase update: ${error.message}`);
  }
}

const payload = await download();
const candidates = selectQualityCandidates(payload.elements || []);
const rows = candidates.map(mapElement);
const output = `overpass-${cityArg}-${new Date().toISOString().slice(0, 10)}.json`;

fs.writeFileSync(output, JSON.stringify({ license: 'ODbL 1.0', attribution: '© OpenStreetMap contributors', rows }, null, 2));
console.log(`${rows.length} POIs baixados para ${output}.`);

if (apply) {
  await persist(rows);
  console.log(`${rows.length} POIs enviados ao Supabase (${activate ? 'ativos' : 'aguardando curadoria'}).`);
} else {
  console.log('Dry-run concluido. Revise o JSON e use --apply para importar sem ativar.');
}
