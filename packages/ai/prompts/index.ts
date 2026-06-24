import type { TripInput } from '../types';
import { AI_BLOCK_TYPES } from '../types';
import { formatConstraintsForPrompt } from '../rules/travel-rules';

export function buildPlanTripPrompt(
  input: TripInput,
  constraints: string[],
  totalDays: number
): string {
  return `Crie o planejamento macro de uma viagem.

Dados da viagem:
- Título: ${input.title}
- Origem: ${input.origin}
- Destinos: ${input.destinations.join(', ')}
- Período: ${input.startDate} a ${input.endDate} (${totalDays} dias)
- Viajantes: ${input.travelersCount}
- Cliente: ${input.clientName}

Restrições:
${formatConstraintsForPrompt(constraints)}

Retorne JSON com esta estrutura exata:
{
  "tripDescription": {
    "title": "string",
    "summary": "string (2-4 frases)",
    "highlights": ["string", "..."]
  },
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "destination": "cidade principal do dia",
      "theme": "tema do dia em poucas palavras",
      "focus": ["foco1", "foco2"]
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

  return `Gere os blocos de conteúdo para um dia do roteiro.

Viagem: ${input.title}
Dia ${dayPlan.day} — ${dayPlan.date}
Destino: ${dayPlan.destination}
Tema: ${dayPlan.theme}
Focos: ${dayPlan.focus.join(', ')}

Restrições:
${formatConstraintsForPrompt(constraints)}

Tipos de bloco permitidos (campo "type"): ${allowedTypes}

Retorne JSON:
{
  "day": ${dayPlan.day},
  "daySummary": {
    "title": "título do dia",
    "subTitle": "subtítulo opcional",
    "details": "resumo de 2-3 frases"
  },
  "blocks": [
    {
      "type": "places|activity|transport|text|suggested_places",
      "title": "string",
      "subTitle": "opcional",
      "details": "opcional",
      "customSymbol": "opcional"
    }
  ]
}

Inclua entre 3 e 6 blocos por dia, variando lugares, atividades, transporte, dicas (text) e suggested_places.
Não repita o day_summary dentro de blocks — ele vai em daySummary.`;
}
