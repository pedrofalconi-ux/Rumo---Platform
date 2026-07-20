import type { ItineraryItem } from '../types';

export interface TemplateContextBlock {
  dayNumber: number;
  title: string;
  category: string;
  period: 'morning' | 'afternoon' | 'night' | 'any';
  required: boolean;
  tags: string[];
  description?: string;
  aiInstructions?: string;
}

export interface TemplateContextRule {
  type: string;
  params: Record<string, unknown>;
}

export interface TemplateDocumentMatch {
  content: string;
  similarity: number;
  documentName?: string;
}

export interface ItineraryTemplateContext {
  id: string;
  name: string;
  destination: string;
  blocks: TemplateContextBlock[];
  rules: TemplateContextRule[];
  ragContext?: TemplateDocumentMatch[];
}

export interface TemplateDocumentRetriever {
  retrieve(input: { templateId: string; query: string; limit?: number }): Promise<TemplateDocumentMatch[]>;
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokenSet(value: string) {
  return new Set(normalize(value).split(' ').filter((token) => token.length > 2));
}

function overlapScore(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0;
  let matches = 0;
  for (const token of left) if (right.has(token)) matches += 1;
  return matches / Math.max(left.size, right.size);
}

export function calculateTemplateMatch(items: ItineraryItem[], template: ItineraryTemplateContext) {
  const relevantItems = items.filter((item) => !['trip_desc', 'day_summary', 'text'].includes(item.type));
  const matchedBlocks = template.blocks.filter((block) => {
    const blockTokens = tokenSet(`${block.title} ${block.category} ${block.tags.join(' ')}`);
    return relevantItems.some((item) => item.day === block.dayNumber && overlapScore(blockTokens, tokenSet(`${item.title} ${item.details || ''} ${item.type}`)) >= 0.34);
  });
  const required = template.blocks.filter((block) => block.required);
  const matchedRequired = matchedBlocks.filter((block) => block.required);
  const templateRatio = template.blocks.length ? matchedBlocks.length / template.blocks.length : 0;
  const requiredRatio = required.length ? matchedRequired.length / required.length : 1;
  const templatePercent = Math.round(Math.min(1, templateRatio * 0.75 + requiredRatio * 0.25) * 100);
  const customizationPercent = Math.round((100 - templatePercent) * 0.6);
  return {
    templatePercent,
    customizationPercent,
    aiSuggestionsPercent: 100 - templatePercent - customizationPercent,
    matchedBlocks: matchedBlocks.length,
    totalBlocks: template.blocks.length,
    matchedRequired: matchedRequired.length,
    totalRequired: required.length,
  };
}

export function formatTemplatePromptContext(template: ItineraryTemplateContext) {
  const required = template.blocks.filter((block) => block.required);
  const optional = template.blocks.filter((block) => !block.required);
  const lines = [
    `MODELO SELECIONADO: ${template.name} (${template.destination})`,
    'Itens obrigatórios (preserve o dia quando possível):',
    ...required.map((block) => `- Dia ${block.dayNumber} [${block.period}] ${block.title}. ${block.aiInstructions || block.description || ''}`),
    'Itens opcionais (adapte ao perfil e às datas):',
    ...optional.map((block) => `- Dia ${block.dayNumber} [${block.period}] ${block.title}. ${block.aiInstructions || ''}`),
    'Regras do modelo:',
    ...template.rules.map((rule) => `- ${rule.type}: ${JSON.stringify(rule.params)}`),
    ...(template.ragContext?.length ? ['Referências recuperadas:', ...template.ragContext.map((match) => `- ${match.content.slice(0, 700)}`)] : []),
  ];
  return lines.join('\n');
}
