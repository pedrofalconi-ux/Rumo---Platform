/* eslint-disable no-console */

async function main() {
  const mediaModule = await import('../apps/web/lib/media/select-itinerary-images.ts');
  const fallbackModule = await import('../apps/web/lib/media/fallback-images.ts');
  const {
    buildImageQueryCandidates,
    sanitizeImageQuery,
    simplifyImageQuery,
    translateImageQuery,
  } = mediaModule;
  const { classifyFallbackImage, getCategoryFallbackImage } = fallbackModule;

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
    {
      name: 'Termos em portugues geram alternativa simples em ingles',
      item: {
        id: '4',
        day: 3,
        type: 'places',
        title: 'Almoco na praia de Tambaú',
        meta: {
          originalTitle: 'Almoco na praia de Tambau',
          imageSearchQuery: 'Almoco na praia de Tambau',
        },
      },
      destination: 'Joao Pessoa',
      expected: ['almoco na praia', 'lunch beach tambau', 'joao pessoa'],
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
  console.log(`  translateImageQuery("Almoco na praia de Tambau") -> "${translateImageQuery('Almoco na praia de Tambau')}"`);

  const fallbackScenarios = [
    { title: 'Museu do Louvre', details: 'Galeria e monumento', expected: 'museum' },
    { title: 'Almoço em trattoria local', details: 'Pasta e gelato', expected: 'italian_food' },
    { title: 'Jantar japonês', details: 'Sushi e sashimi', expected: 'japanese_food' },
    { title: 'Café da manhã', details: 'Padaria e brunch', expected: 'cafe' },
    { title: 'Embarque no aeroporto', details: 'Voo internacional', expected: 'flight_airport' },
    { title: 'Fim de tarde na praia', details: 'Caminhada pela orla', expected: 'beach' },
  ];

  console.log('\nFallbacks categorizados:');
  fallbackScenarios.forEach((scenario, index) => {
    const item = { id: `fallback-${index}`, day: 1, type: 'places', ...scenario };
    const category = classifyFallbackImage(item);
    const first = getCategoryFallbackImage(item);
    const second = getCategoryFallbackImage(item);
    const stable = first.url === second.url;
    console.log(`  ${scenario.title}: ${category} (${stable ? 'estavel' : 'instavel'})`);
    if (category !== scenario.expected || !stable) failures += 1;
  });

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
