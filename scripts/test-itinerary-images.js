/* eslint-disable no-console */

async function main() {
  const mediaModule = await import('../apps/web/lib/media/select-itinerary-images.ts');
  const {
    buildImageQueryCandidates,
    sanitizeImageQuery,
    simplifyImageQuery,
  } = mediaModule;

  const scenarios = [
    {
      name: 'Atração icônica com query da IA',
      item: {
        id: '1',
        day: 1,
        type: 'places',
        title: '09:00 - Visita ao Coliseu',
        meta: {
          originalTitle: 'Visita ao Coliseu',
          imageSearchQuery: 'Colosseum Rome',
          location: {
            name: 'Colosseum',
            address: 'Piazza del Colosseo, Rome',
          },
        },
      },
      destination: 'Rome',
      expected: ['colosseum rome', 'colosseum', 'rome'],
    },
    {
      name: 'Voo com fallback de destino',
      item: {
        id: '2',
        day: 1,
        type: 'transport',
        title: '14:00 - Transfer aeroporto → hotel',
        meta: {
          originalTitle: 'Transfer aeroporto hotel',
          imageSearchQuery: 'Airplane Flight',
        },
      },
      destination: 'Paris',
      expected: ['airplane flight', 'paris'],
    },
    {
      name: 'Query longa e suja simplificada',
      item: {
        id: '3',
        day: 2,
        type: 'activity',
        title: 'Tour gastronômico',
        meta: {
          imageSearchQuery: 'Visita ao Louvre Museum Rue de Rivoli 75001',
          location: {
            name: 'Louvre Museum',
          },
        },
      },
      destination: 'Paris',
      expected: ['visita ao louvre museum', 'louvre museum', 'paris'],
    },
  ];

  let failures = 0;

  console.log('Verificando heuristicas de busca de imagem...\n');

  for (const scenario of scenarios) {
    const candidates = buildImageQueryCandidates(scenario.item, scenario.destination);
    const missing = scenario.expected.filter((term) => !candidates.includes(term));

    console.log(`- ${scenario.name}`);
    console.log(`  candidates: ${JSON.stringify(candidates)}`);

    if (missing.length > 0) {
      failures += 1;
      console.log(`  faltando: ${JSON.stringify(missing)}`);
    } else {
      console.log('  ok');
    }
  }

  console.log('\nSanitizacao rapida:');
  console.log(`  sanitizeImageQuery("Eiffel Tower, Paris 2026!") -> "${sanitizeImageQuery('Eiffel Tower, Paris 2026!')}"`);
  console.log(`  simplifyImageQuery("Visita ao Louvre Museum Rue de Rivoli") -> "${simplifyImageQuery('Visita ao Louvre Museum Rue de Rivoli')}"`);

  if (failures > 0) {
    console.error(`\nFalha em ${failures} cenario(s).`);
    process.exit(1);
  }

  console.log('\nTodos os cenarios passaram.');
  console.log('Execute com: npx tsx scripts/test-itinerary-images.js');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
