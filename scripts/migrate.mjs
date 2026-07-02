#!/usr/bin/env node
/**
 * scripts/migrate.mjs
 *
 * Aplica as migrations SQL no Supabase usando a REST API (sem psql).
 * Usa a função pg_execute via RPC (Supabase Management API).
 *
 * USO:
 *   node scripts/migrate.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ─── Configuração ─────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ||
  (SUPABASE_URL.match(/^https:\/\/([^.]+)\.supabase\.co$/)?.[1] ?? '');
const MIGRATION_DIR = path.join(ROOT, 'packages', 'db', 'migrations');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !PROJECT_REF) {
  throw new Error(
    'Defina SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SUPABASE_PROJECT_REF antes de rodar este script.'
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function runSQL(sql) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`SQL Error (${res.status}): ${text}`);
  }
  return text;
}

async function runSQLViaRPC(sql) {
  // Alternative: use Supabase's internal postgres proxy
  const url = `${SUPABASE_URL}/rest/v1/rpc/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text };
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_SQL = `
-- ─── Seed: Horizon Enterprise Agency ─────────────────────────────────────────
INSERT INTO agencies (id, name, slug, logo_url, plan, credits)
VALUES (
  '019000000000000000000000aa',
  'Horizon Enterprise',
  'horizon-enterprise',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuByVbq23E6OnSqiaWYWht_8Baa9X5GgtucaFmgzZY6ToYLGjTPsAmpieIfEh3-ppopeJYwKzu4fAeAxnUYL07EklM_Ww_OSFKCZVESBQliejmPsC0WN9f3emDyFvsMT9HNSS9zi9pizmHOAoG7OM_vsmzl2X9nSUCNbBOaa_ECdF-O-B6cBjvH4RbcC52EPyW1rPFKQmzvk8phVG9TL_VmGtPtPQwLjanyPbZwBzCk3a2R6pHxc1dPMBikHxV1L0q9kDmCw_PFSTIW5',
  'pro',
  500
)
ON CONFLICT (slug) DO NOTHING;

-- ─── Seed: Sample Itinerary Roma ─────────────────────────────────────────────
INSERT INTO itineraries (
  agency_id,
  agent_id,
  title,
  destination,
  origin,
  start_date,
  end_date,
  travelers,
  status,
  content
)
SELECT
  '019000000000000000000000aa',
  NULL,
  'Viagem Roma Premium',
  'Roma',
  'São Paulo (GRU)',
  '2024-07-24',
  '2024-07-31',
  2,
  'confirmed',
  '{
    "items": [
      {
        "id": "item-1",
        "day": 1,
        "type": "flight",
        "title": "Voo ITA Airways",
        "subTitle": "AZ 673",
        "details": "Voo direto de São Paulo (GRU) para Roma (FCO)",
        "customSymbol": "flight",
        "meta": {
          "airline": "ITA Airways",
          "flightNumber": "AZ 673",
          "origin": "São Paulo (GRU)",
          "destination": "Roma (FCO)",
          "departureTime": "14:25",
          "arrivalTime": "06:45 (+1 dia)",
          "duration": "11h 20m"
        }
      },
      {
        "id": "item-2",
        "day": 1,
        "type": "hotel",
        "title": "Hotel Artemide Roma",
        "subTitle": "Acomodação",
        "details": "Hotel 4 estrelas no centro histórico de Roma.",
        "customSymbol": "hotel",
        "meta": {
          "address": "Via Nazionale, 22",
          "rooms": "1 Quarto Superior",
          "checkin": "15:00"
        }
      },
      {
        "id": "item-3",
        "day": 2,
        "type": "activity",
        "title": "Tour Coliseu + Foro Romano",
        "subTitle": "Visita guiada",
        "details": "Acesso prioritário com guia especializado.",
        "customSymbol": "museum",
        "meta": {
          "type": "Tour",
          "duration": "3 horas"
        }
      }
    ],
    "summary": "7 dias em Roma com roteiro cultural completo.",
    "highlights": ["Coliseu", "Vaticano", "Trastevere", "Pantheon"]
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM itineraries 
  WHERE title = 'Viagem Roma Premium' 
  AND agency_id = '019000000000000000000000aa'
);
`;

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Rumo Migration Runner\n');
  console.log(`📡 Projeto: ${PROJECT_REF}`);
  console.log(`📂 Migrations: ${MIGRATION_DIR}\n`);

  // Listar arquivos de migration
  const files = fs
    .readdirSync(MIGRATION_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('⚠️  Nenhum arquivo .sql encontrado em', MIGRATION_DIR);
    return;
  }

  // Testar conectividade primeiro
  console.log('🔌 Testando conectividade com Supabase...');
  try {
    const testRes = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
    console.log(`   Status: ${testRes.status} ${testRes.ok ? '✅' : '❌'}\n`);
  } catch (e) {
    console.error('❌ Falha de conectividade:', e.message);
    process.exit(1);
  }

  // Tentar Management API
  console.log('📋 Tentando Management API...');
  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATION_DIR, file), 'utf-8');
    console.log(`  📄 ${file} (${sql.length} chars)`);

    try {
      await runSQL(sql);
      console.log(`     ✅ Aplicado com sucesso`);
    } catch (err) {
      console.log(`     ⚠️  ${err.message}`);
      console.log('     → Tentando via RPC...');
      const rpc = await runSQLViaRPC(sql);
      if (rpc.ok) {
        console.log('     ✅ Aplicado via RPC');
      } else {
        console.log(`     ❌ RPC falhou (${rpc.status}): ${rpc.body.slice(0, 200)}`);
        console.log('\n📌 A migration precisa ser aplicada manualmente no Supabase Dashboard:');
        console.log('   https://supabase.com/dashboard/project/xypnpnsswufjyucouneg/sql\n');
        console.log('   Cole o conteúdo do arquivo:', path.join(MIGRATION_DIR, file));
        process.exit(1);
      }
    }
  }

  // Seed data
  console.log('\n🌱 Aplicando seed data...');
  try {
    await runSQL(SEED_SQL);
    console.log('   ✅ Seed aplicado');
  } catch (err) {
    console.log(`   ⚠️  Seed: ${err.message.slice(0, 100)}`);
  }

  console.log('\n✅ Migration concluída!');
  console.log('🌐 Dashboard: https://supabase.com/dashboard/project/xypnpnsswufjyucouneg/editor');
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
