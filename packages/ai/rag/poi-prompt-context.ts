import type { PoiRetrievalResult } from './poi-retriever';

function clean(value: string | undefined, maxLength = 180) {
  return value?.replace(/[\r\n|]+/g, ' ').trim().slice(0, maxLength) || '';
}

export function buildPoiPromptContext(result?: PoiRetrievalResult, previouslyUsedPlaceNames: string[] = []): string {
  const diversityRule = previouslyUsedPlaceNames.length
    ? `\nLugares ja usados em dias anteriores (NAO repetir):\n${previouslyUsedPlaceNames.map((name) => `- ${clean(name, 100)}`).join('\n')}`
    : '';
  if (!result || result.coverage === 'uncovered' || result.pois.length === 0) {
    return `Cobertura factual de POIs: NAO DISPONIVEL NA BASE RUMO.
- Voce PODE citar atracoes, restaurantes, cafes, bares e outros lugares reais que conheca com alta confianca.
- Todo lugar vindo apenas do seu conhecimento deve usar meta.poiValidation="model_knowledge" e meta.verificationRequired=true.
- Nao invente endereco, coordenadas, horario, preco, avaliacao ou disponibilidade. Omita o campo incerto em vez de fabricar.
- Quando a confianca no nome for baixa, use descricao generica qualificada com bairro real.
- Priorize pontos conhecidos e estaveis do destino; evite estabelecimentos obscuros ou possivelmente fechados.${diversityRule}`;
  }

  const entries = result.pois.map((poi) => {
    const location = [clean(poi.neighborhood), clean(poi.address)].filter(Boolean).join(' · ');
    const reputation = poi.rating && poi.userRatingCount
      ? `avaliacao ao vivo ${poi.rating.toFixed(1)} (${poi.userRatingCount} avaliacoes)`
      : '';
    const editorial = poi.partner ? 'parceiro destacado pela agencia' : '';
    const detail = [clean(poi.description), poi.priceRange, reputation, editorial, poi.tags.slice(0, 5).map(clean).filter(Boolean).join(', ')]
      .filter(Boolean)
      .join(' · ');
    return `- [${poi.type}] ${clean(poi.name, 100)}${location ? ` | ${location}` : ''}${detail ? ` | ${detail}` : ''}`;
  });

  return `Cobertura factual de POIs: ${result.coverage === 'covered' ? 'CURADA' : 'PARCIAL'}.
POIs reais validados para ${clean(result.normalizedCity, 100)}:
${entries.join('\n')}

Regras obrigatorias de grounding:
- Priorize os itens da lista e marque-os com meta.poiValidation="curated" e meta.verificationRequired=false.
- Quando a lista contiver restaurantes, use pelo menos um nome curado no almoco e outro no jantar, evitando repetir o mesmo estabelecimento em dias consecutivos.
- Preserve o nome exatamente como fornecido; nao crie filiais, variacoes ou enderecos.
- Se nenhum item servir, voce pode citar outro lugar real de alta confianca, marcando meta.poiValidation="model_knowledge" e meta.verificationRequired=true.
- Se a confianca no nome for baixa, use descricao generica qualificada sem nome fantasia.
- Nao afirme horario de funcionamento, preco, reserva ou disponibilidade que nao conste no contexto.
- Nao repita restaurante, cafe ou bar usado em outro dia da mesma viagem.${diversityRule}`;
}
