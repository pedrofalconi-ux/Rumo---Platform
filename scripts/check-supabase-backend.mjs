#!/usr/bin/env node

import fs from 'fs';

const envFiles = ['.env', 'apps/web/.env.local'];

for (const file of envFiles) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index === -1) continue;
    const key = line.slice(0, index);
    const value = line.slice(index + 1).replace(/^"|"$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET = process.env.RUMO_REMOTE_DB_BUCKET || 'rumo-data';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Defina NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
}

const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
};

const dataApiTables = [
  'agencies',
  'users',
  'clients',
  'itineraries',
  'library_folders',
  'library_photos',
  'notifications',
  'traveler_invites',
  'traveler_trip_access',
  'ai_generations',
];

async function checkStorage() {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: 'json-db', limit: 100, offset: 0 }),
  });
  const text = await res.text();
  return {
    ok: res.ok,
    status: res.status,
    body: text,
  };
}

async function checkTable(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, { headers });
  const text = await res.text();
  return {
    table,
    ok: res.ok,
    status: res.status,
    body: text.slice(0, 300),
  };
}

async function main() {
  console.log('🔎 Supabase backend audit\n');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Bucket: ${BUCKET}\n`);

  const storage = await checkStorage();
  console.log(`Storage JSON DB: ${storage.status} ${storage.ok ? 'OK' : 'FAIL'}`);
  console.log(storage.body.slice(0, 500));
  console.log('');

  console.log('Data API tables:');
  for (const table of dataApiTables) {
    const result = await checkTable(table);
    console.log(`- ${result.table}: ${result.status} ${result.ok ? 'OK' : 'MISSING/UNEXPOSED'}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
