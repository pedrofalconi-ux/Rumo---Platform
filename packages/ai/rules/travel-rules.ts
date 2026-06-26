import type { RuleContext, TripInput, TripProfile } from '../types';
import { BLOCKED_AI_BLOCK_TYPES } from '../types';

const PROFILE_LABELS: Record<TripProfile, string> = {
  lazer: 'lazer e descanso',
  lua_de_mel: 'lua de mel romântica',
  aventura: 'aventura e experiências ativas',
  cultural: 'cultura, história e museus',
  negocios: 'viagem a negócios com tempo livre limitado',
};

export function buildRuleContext(input: TripInput): RuleContext {
  const constraints: string[] = [
    'Responda exclusivamente em português do Brasil.',
    'Nunca invente voos emitidos, hotéis reservados, PNR ou confirmações de reserva.',
    'Não use os tipos de bloco: flight, hotel, attachments, page_break.',
    'Use nomes reais de lugares e experiencias; nunca use placeholders ou titulos genericos.',
    'Todo dia deve formar uma trilha viavel por proximidade geografica, com horarios e pausas realistas.',
    `Perfil da viagem: ${PROFILE_LABELS[input.profile]}.`,
    `Orçamento total aproximado: R$ ${input.budget.toLocaleString('pt-BR')}.`,
  ];

  if (input.budget > 0 && input.budget < 5000) {
    constraints.push(
      'Orçamento enxuto: priorize experiências gratuitas ou de baixo custo; evite sugestões de luxo.'
    );
  }

  if (input.budget >= 15000) {
    constraints.push('Orçamento premium: pode incluir experiências exclusivas e gastronomia refinada.');
  }

  if (input.profile === 'lua_de_mel') {
    constraints.push('Priorize jantares românticos, vistas panorâmicas e experiências a dois.');
  }

  if (input.profile === 'negocios') {
    constraints.push('Reserve manhãs flexíveis; sugira atividades compactas no fim do dia.');
  }

  const pref = input.preferences.toLowerCase();
  if (pref.includes('crianç') || pref.includes('família') || pref.includes('familia')) {
    constraints.push('Viajantes com crianças: priorize parques, pausas e horários mais curtos.');
  }

  if (input.preferences.trim()) {
    constraints.push(`Preferências do cliente: ${input.preferences.trim()}.`);
  }

  return {
    constraints,
    blockedTypes: [...BLOCKED_AI_BLOCK_TYPES],
  };
}

export function formatConstraintsForPrompt(constraints: string[]): string {
  return constraints.map((c) => `- ${c}`).join('\n');
}
