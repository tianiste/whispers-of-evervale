import { decorations, stableDecorationSlots, type DecorationId, type StableDecorationSlotId } from './decorations';
import { cleanHorseName, getHorse, horses, type HorseId } from './horses';
import { items, type ItemId } from './items';
import { outfits, type OutfitId } from './outfits';
import { riderAppearances, type RiderAppearanceId } from './riderAppearances';
import { firstRideQuest, echoQuest } from './quests';
import { activityIds, storyObjectives } from './story';
import { getEcho, isEchoId, type EchoId } from './echoes';
import { clearingRace } from './race';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';

export const SAVE_VERSION = 1;
const SAVE_KEY = 'whispers-of-evervale-save';
const MAX_INVENTORY_COUNT = 99999;
const MAX_RACE_TIME_MS = 86_400_000;
export const STORY_COMPLETE = 'complete';

export type SavedDialogueId =
  | 'stable-keeper-greeting'
  | 'echo-keeper-clue'
  | 'echo-guide-clue'
  | 'village-baker'
  | 'trail-guide'
  | 'birthday-finale'
  | 'story-inspect'
  | 'echo-reflection';

const savedDialogueIds: readonly SavedDialogueId[] = ['stable-keeper-greeting', 'echo-keeper-clue', 'echo-guide-clue',
  'village-baker', 'trail-guide', 'birthday-finale', 'story-inspect', 'echo-reflection'];

export interface GameSave {
  version: typeof SAVE_VERSION;
  appearanceId: RiderAppearanceId;
  horseId: HorseId;
  /** Null until the horse is chosen in Meet Your Horse. */
  horseName: string | null;
  player: { x: number; y: number };
  horse: { x: number; y: number };
  mounted: boolean;
  outfitId: OutfitId;
  storyIndex: number;
  /** Objective ID at storyIndex; wins over the index so inserted content cannot shift progress. */
  storyTarget: string;
  activityProgress: string[];
  /** Objective whose text an open dialogue shows. */
  dialogueTarget: string | null;
  restoredEchoes: EchoId[];
  /** Solved steps of an Echo left part-way. */
  echoProgress: { id: EchoId; steps: string[] } | null;
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
  return savedDialogueIds.some(id => id === value);
}

/** Unique IDs from `allowed`; ordered activities must be a prefix of it. */
function isProgress(value: unknown, allowed: readonly string[], ordered: boolean): value is string[] {
  if (!Array.isArray(value) || value.length > allowed.length || new Set(value).size !== value.length) return false;
  return value.every((id, index) => typeof id === 'string' && (ordered ? allowed[index] === id : allowed.includes(id)));
}

function isEchoList(value: unknown): value is EchoId[] {
  return Array.isArray(value) && value.every(isEchoId) && new Set(value).size === value.length;
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

    // Additive v1 fields: older saves start the story and keep possessions.
    const savedIndex = value.storyIndex === undefined ? (value.echoQuestIndex === echoQuest.objectives.length ? storyObjectives.length : 0) : value.storyIndex;
    if (typeof savedIndex !== 'number' || !Number.isInteger(savedIndex) || savedIndex < 0 || savedIndex > storyObjectives.length) return null;
    if (value.storyTarget !== undefined && typeof value.storyTarget !== 'string') return null;
    const targetIndex = value.storyTarget === STORY_COMPLETE ? -1 : storyObjectives.findIndex(o => o.id === value.storyTarget);
    const storyIndex = targetIndex >= 0 ? targetIndex : savedIndex;
    const objective = storyObjectives[storyIndex];

    const activityProgress = value.activityProgress === undefined ? [] : value.activityProgress;
    if (!isProgress(activityProgress, activityIds(objective), objective?.type === 'trail') ||
      (activityProgress.length > 0 && activityProgress.length === activityIds(objective).length)) return null;

    // Players from before Meet Your Horse chose their horse in the creator.
    const horseName = value.horseName === undefined ? getHorse(value.horseId).name : value.horseName;
    if (horseName !== null && (typeof horseName !== 'string' || !horseName || cleanHorseName(horseName) !== horseName)) return null;

    const restoredEchoes = value.restoredEchoes === undefined ? [] : value.restoredEchoes;
    if (!isEchoList(restoredEchoes)) return null;
    let echoProgress: GameSave['echoProgress'] = null;
    if (value.echoProgress !== undefined && value.echoProgress !== null) {
      const record: Record<string, unknown> = isRecord(value.echoProgress) ? value.echoProgress : {};
      const { id, steps } = record;
      if (!isEchoId(id) || restoredEchoes.includes(id) || !isProgress(steps, getEcho(id).steps.map(step => step.id), true)) return null;
      echoProgress = { id, steps: [...steps] };
    }

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
    if (horseName === null && (value.mounted || checkpointIndex !== null)) return null;

    const dialogue = value.dialogue;
    if (dialogue !== null && !isSavedDialogueId(dialogue)) return null;
    const dialogueTarget = value.dialogueTarget ?? null;
    if (dialogueTarget !== null && (typeof dialogueTarget !== 'string' || !storyObjectives.some(o => o.id === dialogueTarget))) return null;
    const dialogueObjective = dialogueTarget ? storyObjectives.find(o => o.id === dialogueTarget) : storyObjectives[storyIndex - 1];
    if (dialogue === 'story-inspect' && dialogueObjective?.type !== 'inspect') return null;
    if (dialogue === 'echo-reflection' && dialogueObjective?.type !== 'echo') return null;

    return {
      version: SAVE_VERSION,
      storyIndex,
      storyTarget: objective?.id ?? STORY_COMPLETE,
      activityProgress,
      dialogueTarget,
      restoredEchoes,
      echoProgress,
      appearanceId: value.appearanceId,
      horseId: value.horseId,
      horseName,
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
