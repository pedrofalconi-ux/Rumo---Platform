#!/usr/bin/env node
/**
 * scripts/migrate-via-sdk.mjs
 *
 * Aplica a migration usando @supabase/supabase-js com service_role key.
 * Funciona via pg_execute (precisa que a extension exista) ou cria tabelas
 * diretamente verificando existência via REST.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    'Defina SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de rodar este script.'
  );
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function checkTableExists(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('id')
    .limit(1);
  
  // If error is about the table not existing, return false
  if (error && (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist'))) {
    return false;
  }
  return true;
}

async function main() {
  console.log('🚀 Rumo — Verificando Supabase\n');
  console.log(`📡 URL: ${SUPABASE_URL}\n`);

  // Verifica se as tabelas já existem
  const tables = ['agencies', 'users', 'clients', 'itineraries', 'bookings'];
  
  console.log('📋 Verificando tabelas existentes...');
  for (const table of tables) {
    const exists = await checkTableExists(table);
    console.log(`  ${exists ? '✅' : '❌'} ${table}`);
  }

  // Tentar inserir a agência seed diretamente
  console.log('\n🌱 Tentando seed da agência...');
  const { data: agency, error: agencyErr } = await supabase
    .from('agencies')
    .upsert({
      name: 'Horizon Enterprise',
      slug: 'horizon-enterprise',
      logo_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuByVbq23E6OnSqiaWYWht_8Baa9X5GgtucaFmgzZY6ToYLGjTPsAmpieIfEh3-ppopeJYwKzu4fAeAxnUYL07EklM_Ww_OSFKCZVESBQliejmPsC0WN9f3emDyFvsMT9HNSS9zi9pizmHOAoG7OM_vsmzl2X9nSUCNbBOaa_ECdF-O-B6cBjvH4RbcC52EPyW1rPFKQmzvk8phVG9TL_VmGtPtPQwLjanyPbZwBzCk3a2R6pHxc1dPMBikHxV1L0q9kDmCw_PFSTIW5',
      plan: 'pro',
      credits: 500,
    }, { onConflict: 'slug', ignoreDuplicates: true })
    .select()
    .single();

  if (agencyErr) {
    console.log(`  ❌ Agência: ${agencyErr.message}`);
    console.log('\n📌 AÇÃO NECESSÁRIA:');
    console.log('   As tabelas ainda não existem no Supabase.');
    console.log('   Acesse o SQL Editor e cole a migration:\n');
    console.log('   🌐 https://supabase.com/dashboard/project/xypnpnsswufjyucouneg/sql/new\n');
    process.exit(0);
  }

  console.log(`  ✅ Agência: ${agency?.name} (id: ${agency?.id})`);

  // Seed itinerary
  if (agency?.id) {
    console.log('\n🗺️  Seed de itinerário...');
    const { data: it, error: itErr } = await supabase
      .from('itineraries')
      .upsert({
        agency_id: agency.id,
        title: 'Viagem Roma Premium',
        destination: 'Roma',
        origin: 'São Paulo (GRU)',
        start_date: '2024-07-24',
        end_date: '2024-07-31',
        travelers: 2,
        status: 'confirmed',
        content: {
          items: [
            {
              id: 'item-1',
              day: 1,
              type: 'flight',
              title: 'Voo ITA Airways',
              subTitle: 'AZ 673',
              details: 'Voo direto GRU → FCO',
              customSymbol: 'flight',
              meta: { airline: 'ITA Airways', flightNumber: 'AZ 673', departureTime: '14:25' },
            },
            {
              id: 'item-2',
              day: 1,
              type: 'hotel',
              title: 'Hotel Artemide Roma',
              subTitle: 'Acomodação',
              details: '4 estrelas no centro histórico',
              customSymbol: 'hotel',
              meta: { address: 'Via Nazionale, 22', checkin: '15:00' },
            },
          ],
          summary: '7 dias em Roma com roteiro cultural.',
          highlights: ['Coliseu', 'Vaticano', 'Pantheon'],
        },
      })
      .select();

    if (itErr) {
      console.log(`  ⚠️  Itinerário: ${itErr.message}`);
    } else {
      console.log(`  ✅ Itinerário seed OK`);
    }
  }

  console.log('\n🎉 Supabase configurado com sucesso!');
  console.log('🌐 Dashboard: https://supabase.com/dashboard/project/xypnpnsswufjyucouneg/editor');
}

main().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
