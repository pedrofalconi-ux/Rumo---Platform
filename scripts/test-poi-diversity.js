/* eslint-disable no-console */

async function main() {
  const { assertDiningDiversity, collectUsedDiningPlaceNames } = await import(
    '../packages/ai/orchestrator/ai-orchestrator.ts'
  );

  const makeDay = (title) => ({
    day: 2,
    daySummary: { title: 'Dia em João Pessoa', details: 'Roteiro diverso' },
    blocks: [
      {
        type: 'places',
        title,
        subTitle: 'Jantar recomendado',
        details: 'Restaurante real para encerrar o dia.',
        location: { name: title, latitude: -7.1, longitude: -34.8 },
      },
    ],
  });

  const repeated = makeDay('Sake Temakeria');
  let rejected = false;
  try {
    assertDiningDiversity(repeated, ['Sake Temakeria'], ['Sake Temakeria', 'Mangai']);
  } catch (error) {
    rejected = String(error).includes('Sake Temakeria');
  }
  if (!rejected) throw new Error('Restaurante usado em outro dia nao foi rejeitado.');

  const diverse = makeDay('Mangai');
  assertDiningDiversity(diverse, ['Sake Temakeria'], ['Mangai', 'NAU Frutos do Mar']);

  const used = collectUsedDiningPlaceNames(diverse, ['Mangai', 'NAU Frutos do Mar']);
  if (!used.includes('Mangai')) throw new Error('Restaurante escolhido nao foi registrado como usado.');

  console.log('Repeticao entre dias rejeitada.');
  console.log('Restaurante diferente aceito e registrado para os proximos dias.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
