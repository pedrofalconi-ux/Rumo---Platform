import type { TripInput } from '../types';
import { AI_BLOCK_TYPES } from '../types';
import { formatConstraintsForPrompt } from '../rules/travel-rules';

export function buildPlanTripPrompt(
  input: TripInput,
  constraints: string[],
  totalDays: number
): string {
  const destinationPeriods = input.destinationsDetail?.length
    ? input.destinationsDetail
        .map((d) => `${d.city}: ${d.startDate} a ${d.endDate}`)
        .join('; ')
    : 'nao informado';
  const transportContext = input.transportation?.length
    ? input.transportation
        .map(
          (transport) =>
            `- ${transport.type.toUpperCase()}: ${transport.operator || 'Operadora nao informada'} ${transport.number || ''} em ${transport.date}${transport.details ? ` | ${transport.details}` : ''}`
        )
        .join('\n')
    : 'Nenhum transporte cadastrado';
  const accommodationContext = input.accommodations?.length
    ? input.accommodations
        .map(
          (accommodation) =>
            `- Hotel: ${accommodation.name} em ${accommodation.destinationCity} (Check-in: ${accommodation.checkIn}, Check-out: ${accommodation.checkOut})${accommodation.address ? ` | ${accommodation.address}` : ''}`
        )
        .join('\n')
    : 'Nenhuma acomodacao cadastrada';

  return `Voce e um roteirista senior de viagens. Crie o planejamento macro de uma viagem real, com dias agrupados por regioes proximas.

Dados da viagem:
- Titulo: ${input.title}
- Origem: ${input.origin}
- Destinos: ${input.destinations.join(', ')}
- Detalhe dos destinos por periodo: ${destinationPeriods}
- Periodo: ${input.startDate} a ${input.endDate} (${totalDays} dias)
- Viajantes: ${input.travelersCount}
- Cliente: ${input.clientName}
- Perfil: ${input.profile}
- Orcamento: R$ ${input.budget.toLocaleString('pt-BR')}
- Preferencias preenchidas pelo consultor: ${input.preferences || 'nao informado'}

Contexto logistico do passageiro:
[Logistica de Transporte]
${transportContext}
[Logistica de Hoteis/Acomodacao]
${accommodationContext}

Restricoes:
${formatConstraintsForPrompt(constraints)}

Regras de planejamento:
- Cada dia deve ter uma regiao/bairro base clara para evitar deslocamentos longos.
- Distribua pontos famosos, experiencias locais, gastronomia e tempo livre de forma realista.
- Respeite o destino correto de cada data quando houver detalhe dos destinos por periodo.
- Considere o dia de chegada e os meios de transporte cadastrados para encaixar check-in, traslados e inicio gradual do roteiro.
- Quando houver hotel cadastrado, use esse hotel como ancora geografica do dia para partida pela manha e retorno no fim do dia.
- Nao use temas genericos como "Explorando a cidade"; cite a regiao ou eixo real do dia.

Retorne JSON com esta estrutura exata:
{
  "tripDescription": {
    "title": "string",
    "summary": "string (2-4 frases, especifica da viagem)",
    "highlights": ["string", "..."]
  },
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "destination": "cidade principal do dia",
      "theme": "regiao/eixo real do dia, ex: Centro Historico e Trastevere",
      "focus": ["bairro/regiao", "experiencia principal", "ritmo do dia"]
    }
  ]
}

Gere exatamente ${totalDays} entradas em "days", numeradas de 1 a ${totalDays}.
As datas devem ser consecutivas a partir de ${input.startDate}.`;
}

export function buildGenerateDayPrompt(
  input: TripInput,
  dayPlan: { day: number; date: string; destination: string; theme: string; focus: string[] },
  constraints: string[]
): string {
  const allowedTypes = AI_BLOCK_TYPES.filter((t) => t !== 'trip_desc').join(', ');
  const hotelDoDia = input.accommodations?.find(
    (accommodation) =>
      dayPlan.date >= accommodation.checkIn &&
      dayPlan.date <= accommodation.checkOut &&
      dayPlan.destination.toLowerCase().includes(accommodation.destinationCity.toLowerCase().split(' (')[0])
  );
  const transportationDoDia = input.transportation?.filter((transport) => transport.date === dayPlan.date) || [];
  const transportationContext = transportationDoDia.length
    ? transportationDoDia
        .map(
          (transport) =>
            `- ${transport.type.toUpperCase()}: ${transport.operator || 'Operadora nao informada'} ${transport.number || ''}${transport.details ? ` | ${transport.details}` : ''}`
        )
        .join('\n')
    : 'Nenhum transporte especifico neste dia';

  return `Gere uma trilha diaria real, detalhada e otimizada geograficamente.

Contexto da viagem:
- Viagem: ${input.title}
- Dia: ${dayPlan.day}
- Data: ${dayPlan.date}
- Destino: ${dayPlan.destination}
- Regiao/eixo planejado: ${dayPlan.theme}
- Focos do dia: ${dayPlan.focus.join(', ')}
- Perfil: ${input.profile}
- Orcamento: R$ ${input.budget.toLocaleString('pt-BR')}
- Preferencias do usuario/consultor: ${input.preferences || 'nao informado'}
- Transporte previsto neste dia:
${transportationContext}
- Hotel onde o passageiro dormira hoje: ${
    hotelDoDia
      ? `${hotelDoDia.name}${hotelDoDia.address ? ` (${hotelDoDia.address})` : ''}`
      : 'Nao especificado'
  }

Restricoes:
${formatConstraintsForPrompt(constraints)}

Tipos de bloco permitidos (campo "type"): ${allowedTypes}

Qualidade obrigatoria do roteiro:
- O roteiro deve ocupar um dia inteiro, normalmente entre 08:00 e 22:00, com pausas realistas.
- Inclua 7 a 10 blocos no dia, cobrindo manha, almoco, tarde, fim de tarde e noite.
- Use somente lugares, bairros, restaurantes, mercados, mirantes, museus, pracas e experiencias reais do destino.
- Nao use placeholders ou nomes genericos: proibido "Ponto emblematico", "Centro historico de X", "Experiencia cultural recomendada", "Sugestoes extras", "Dica Rumo" como titulo principal.
- Ordene os blocos como uma trilha continua ponto a ponto, escolhendo locais geograficamente proximos. Evite cruzar a cidade sem motivo.
- Preencha recommendedStartTime em todos os blocos no formato HH:mm.
- Preencha estimatedDurationMinutes em todos os blocos.
- Para blocos com lugar fisico, preencha location.name, address aproximado e coordenadas aproximadas.
- O title deve ser apenas o nome real do ponto/atividade, sem horario; o backend adicionara o horario visualmente.
- O subTitle deve explicar a funcao do bloco, por exemplo "Visita essencial", "Almoco recomendado", "Caminhada curta", "Fim de tarde".
- O details deve ter 3 a 5 frases praticas: o que fazer ali, por que esse horario e recomendado, uma dica concreta, e cuidados como ingresso/reserva/filas quando fizer sentido.
- Quando houver deslocamento maior que uma caminhada curta, inclua um bloco "transport" com horario, origem/destino e meio recomendado.
- Para almoco e jantar, prefira restaurantes ou regioes reais adequados ao perfil; se citar restaurante especifico, recomende confirmar funcionamento/reserva.
- Nao invente reservas, tickets comprados, disponibilidade, precos exatos ou promessas de acesso sem fila.
- Se houver hotel especificado, use-o como base de partida pela manha e retorno a noite.
- Se houver transporte no dia, inclua deslocamentos, chegada/saida, check-in/check-out e janelas realistas de transicao.
- Recomende restaurantes, pausas e atividades de fim de tarde coerentes com a volta para o hotel informado.

Retorne JSON:
{
  "day": ${dayPlan.day},
  "daySummary": {
    "title": "titulo especifico do dia com regiao real",
    "subTitle": "cidade/regiao do dia",
    "details": "resumo realista do dia em 2-3 frases, explicando a logica geografica da trilha",
    "imageSearchQuery": "consulta curta para foto do destino/tema do dia"
  },
  "blocks": [
    {
      "type": "places|activity|transport|text|suggested_places",
      "title": "nome real do local ou atividade",
      "subTitle": "papel do bloco no dia",
      "details": "3-5 frases com horario recomendado, motivo, descricao breve e dicas praticas",
      "imageSearchQuery": "nome do local + cidade para buscar foto real",
      "location": {
        "name": "nome real do ponto visitado",
        "address": "endereco, bairro ou regiao aproximada",
        "latitude": -23.5505,
        "longitude": -46.6333
      },
      "estimatedDurationMinutes": 90,
      "recommendedStartTime": "HH:mm",
      "customSymbol": "opcional"
    }
  ]
}

Antes de responder, revise mentalmente:
1. Os pontos existem e pertencem a ${dayPlan.destination}?
2. A ordem reduz deslocamentos?
3. O dia tem ritmo viavel, com pausas e alimentacao?
4. Cada bloco tem horario, duracao, dica real e informacao suficiente para o viajante executar?
5. Nao ha texto generico que serviria para qualquer cidade?`;
}
