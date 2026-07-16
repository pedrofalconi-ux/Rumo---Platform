#!/usr/bin/env node

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const CITIES = {
  roma: { name: 'Roma', country: 'Italia', bbox: [41.6559, 12.2344, 42.1412, 12.8558] },
  paris: { name: 'Paris', country: 'Franca', bbox: [48.8156, 2.2241, 48.9022, 2.4699] },
  // Inclui Orlando, Lake Buena Vista e o eixo dos parques, que fazem parte do
  // destino turistico vendido como "Orlando", embora cruzem limites municipais.
  orlando: { name: 'Orlando', country: 'Estados Unidos', bbox: [28.30, -81.66, 28.62, -81.20] },
};

const args = new Set(process.argv.slice(2));
const cityArg = process.argv.find((value) => value.startsWith('--city='))?.split('=')[1]?.toLowerCase();
const city = cityArg ? CITIES[cityArg] : undefined;
const apply = args.has('--apply');
const activate = args.has('--activate');
const endpoint = process.env.OVERPASS_API_URL || 'https://overpass-api.de/api/interpreter';

if (!city) {
  console.error('Uso: node scripts/import-overpass-pois.mjs --city=roma|paris|orlando [--apply] [--activate]');
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

async function download() {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'User-Agent': 'Rumo-POI-Importer/1.0 (development; contact: platform owner)',
    },
    body: new URLSearchParams({ data: buildQuery(city.bbox) }),
    signal: AbortSignal.timeout(150_000),
  });
  if (!response.ok) throw new Error(`Overpass respondeu ${response.status}: ${(await response.text()).slice(0, 300)}`);
  return response.json();
}

async function persist(rows) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias para --apply');
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  for (let index = 0; index < rows.length; index += 250) {
    const { error } = await supabase
      .from('destination_pois')
      .upsert(rows.slice(index, index + 250), { onConflict: 'provider,provider_record_id' });
    if (error) throw new Error(`Supabase: ${error.message}`);
  }
}

const payload = await download();
const rows = (payload.elements || [])
  .filter((element) => element.tags?.name && (element.lat != null || element.center?.lat != null))
  .map(mapElement);
const output = `overpass-${cityArg}-${new Date().toISOString().slice(0, 10)}.json`;

fs.writeFileSync(output, JSON.stringify({ license: 'ODbL 1.0', attribution: '© OpenStreetMap contributors', rows }, null, 2));
console.log(`${rows.length} POIs baixados para ${output}.`);

if (apply) {
  await persist(rows);
  console.log(`${rows.length} POIs enviados ao Supabase (${activate ? 'ativos' : 'aguardando curadoria'}).`);
} else {
  console.log('Dry-run concluido. Revise o JSON e use --apply para importar sem ativar.');
}
