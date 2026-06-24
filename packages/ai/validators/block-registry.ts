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
