import type { AiBlockType } from '../types';

export const BLOCK_DEFAULT_SYMBOLS: Record<AiBlockType, string> = {
  trip_desc: 'description',
  day_summary: 'calendar_today',
  places: 'museum',
  activity: 'explore',
  transport: 'directions_car',
  text: 'description',
  suggested_places: 'star',
};

export function isAllowedAiBlockType(type: string): type is AiBlockType {
  return type in BLOCK_DEFAULT_SYMBOLS;
}

export function assertAllowedBlocks(
  blocks: Array<{ type: string }>,
  blockedTypes: string[]
): void {
  for (const block of blocks) {
    if (blockedTypes.includes(block.type)) {
      throw new Error(`Block type "${block.type}" is not allowed for AI generation`);
    }
    if (!isAllowedAiBlockType(block.type)) {
      throw new Error(`Block type "${block.type}" is not registered in AI BlockRegistry`);
    }
  }
}

export function sanitizeAllowedBlocks<T extends { type: string; title?: string; details?: string }>(
  blocks: T[],
  blockedTypes: string[]
): Array<T & { type: AiBlockType; details?: string }> {
  return blocks.map((block) => {
    if (!blockedTypes.includes(block.type) && isAllowedAiBlockType(block.type)) {
      return block as T & { type: AiBlockType };
    }

    const reason = blockedTypes.includes(block.type)
      ? `Tipo "${block.type}" convertido automaticamente para texto por nao ser permitido.`
      : `Tipo "${block.type}" convertido automaticamente para texto por nao existir no catalogo da IA.`;

    return {
      ...block,
      type: 'text',
      details: [reason, block.details].filter(Boolean).join(' '),
      title: block.title || 'Orientacao do roteiro',
    };
  });
}
