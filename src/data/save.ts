import { decorations, stableDecorationSlots, type DecorationId, type StableDecorationSlotId } from './decorations';
import { horses, type HorseId } from './horses';
import { items, type ItemId } from './items';
import { outfits, type OutfitId } from './outfits';
import { riderAppearances, type RiderAppearanceId } from './riderAppearances';
import { firstRideQuest, echoQuest } from './quests';
import { clearingRace } from './race';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';

export const SAVE_VERSION = 1;
const SAVE_KEY = 'whispers-of-evervale-save';
const MAX_INVENTORY_COUNT = 99999;
const MAX_RACE_TIME_MS = 86_400_000;

export type SavedDialogueId =
  | 'stable-keeper-greeting'
  | 'echo-keeper-clue'
  | 'echo-guide-clue'
  | 'village-baker'
  | 'trail-guide'
  | 'birthday-finale';

export interface GameSave {
  version: typeof SAVE_VERSION;
  appearanceId: RiderAppearanceId;
  horseId: HorseId;
  player: { x: number; y: number };
  horse: { x: number; y: number };
  mounted: boolean;
  outfitId: OutfitId;
  firstRideIndex: number;
  echoQuestIndex: number;
  inventory: Partial<Record<ItemId, number>>;
  decorations: Record<StableDecorationSlotId, DecorationId>;
  race: { checkpointIndex: number | null; elapsedMs: number; resultText: string };
  dialogue: SavedDialogueId | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasId<T extends string>(value: unknown, values: readonly { id: T }[]): value is T {
  return typeof value === 'string' && values.some(({ id }) => id === value);
}

function isPosition(value: unknown): value is { x: number; y: number } {
  if (!isRecord(value) || typeof value.x !== 'number' || typeof value.y !== 'number') return false;
  return Number.isFinite(value.x) && Number.isFinite(value.y) &&
    value.x >= 0 && value.x <= WORLD_WIDTH && value.y >= 0 && value.y <= WORLD_HEIGHT;
}

function isSavedDialogueId(value: unknown): value is SavedDialogueId {
  return value === 'stable-keeper-greeting' || value === 'echo-keeper-clue' ||
    value === 'echo-guide-clue' || value === 'village-baker' ||
    value === 'trail-guide' || value === 'birthday-finale';
}

export function parseGameSave(serialized: string | null): GameSave | null {
  if (serialized === null || serialized.length > 50000) return null;

  try {
    const value: unknown = JSON.parse(serialized);
    if (!isRecord(value) || value.version !== SAVE_VERSION ||
      !hasId(value.appearanceId, riderAppearances) || !hasId(value.horseId, horses) ||
      !isPosition(value.player) || !isPosition(value.horse) || typeof value.mounted !== 'boolean' ||
      !hasId(value.outfitId, outfits) || !isRecord(value.inventory) || !isRecord(value.decorations) ||
      !isRecord(value.race) || typeof value.firstRideIndex !== 'number' ||
      !Number.isInteger(value.firstRideIndex) || value.firstRideIndex < 0 ||
      value.firstRideIndex > firstRideQuest.objectives.length || typeof value.echoQuestIndex !== 'number' ||
      !Number.isInteger(value.echoQuestIndex) || value.echoQuestIndex < 0 ||
      value.echoQuestIndex > echoQuest.objectives.length) return null;
    if (value.echoQuestIndex > 0 && value.firstRideIndex < firstRideQuest.objectives.length) return null;

    const inventory: Partial<Record<ItemId, number>> = {};
    for (const [id, count] of Object.entries(value.inventory)) {
      if (!hasId(id, items) || typeof count !== 'number' || !Number.isSafeInteger(count) ||
        count < 0 || count > MAX_INVENTORY_COUNT) return null;
      inventory[id] = count;
    }

    const decorationsBySlot = {} as Record<StableDecorationSlotId, DecorationId>;
    for (const slot of stableDecorationSlots) {
      const id = value.decorations[slot.id];
      if (!hasId(id, decorations)) return null;
      decorationsBySlot[slot.id] = id;
    }

    const checkpointIndex = value.race.checkpointIndex;
    const elapsedMs = value.race.elapsedMs;
    const resultText = value.race.resultText;
    if ((checkpointIndex !== null && (typeof checkpointIndex !== 'number' ||
      !Number.isInteger(checkpointIndex) || checkpointIndex < 0 || checkpointIndex >= clearingRace.checkpoints.length)) ||
      typeof elapsedMs !== 'number' || !Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs > MAX_RACE_TIME_MS ||
      typeof resultText !== 'string' || resultText.length > 200) return null;
    if (checkpointIndex !== null && !value.mounted) return null;

    const dialogue = value.dialogue;
    if (dialogue !== null && !isSavedDialogueId(dialogue)) return null;

    return {
      version: SAVE_VERSION,
      appearanceId: value.appearanceId,
      horseId: value.horseId,
      player: value.player,
      horse: value.horse,
      mounted: value.mounted,
      outfitId: value.outfitId,
      firstRideIndex: value.firstRideIndex,
      echoQuestIndex: value.echoQuestIndex,
      inventory,
      decorations: decorationsBySlot,
      race: { checkpointIndex, elapsedMs, resultText },
      dialogue,
    };
  } catch {
    return null;
  }
}

export function loadGameSave(): GameSave | null {
  try {
    const serialized = window.localStorage.getItem(SAVE_KEY);
    const save = parseGameSave(serialized);
    if (serialized !== null && save === null) window.localStorage.removeItem(SAVE_KEY);
    return save;
  } catch {
    return null;
  }
}

export function storeGameSave(save: GameSave): boolean {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}
