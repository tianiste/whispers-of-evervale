import type { DialogueDefinition } from './dialogue';

export const villageRoute = [
  { x: 690, y: 550 },
  { x: 560, y: 490 },
  { x: 460, y: 390 },
  { x: 360, y: 330 },
  { x: 270, y: 280 },
] as const;

interface VillagerDefinition {
  id: string;
  name: string;
  x: number;
  y: number;
  color: number;
  dialogue: DialogueDefinition;
}

export const villagers = [
  {
    id: 'village-baker', name: 'Village Baker', x: 360, y: 330, color: 0xc98d69,
    dialogue: { speaker: 'Village Baker', message: 'Fresh bread for the village. The stable is just down the lane.' },
  },
  {
    id: 'trail-guide', name: 'Trail Guide', x: 250, y: 280, color: 0x8baf82,
    dialogue: { speaker: 'Trail Guide', message: 'This little road is an easy ride back to Sunmeadow Stable.' },
  },
] as const satisfies readonly VillagerDefinition[];

export type CatId = 'nomi' | 'miki' | 'viski' | 'maks' | 'maco';
export type CatBehavior = 'nearby' | 'loud' | 'confused' | 'skittish' | 'wanderer';

export interface CatDefinition {
  id: CatId;
  name: string;
  /** Home position; moving cats return here or roam around it. */
  x: number;
  y: number;
  scale: number;
  behavior: CatBehavior;
  /** Pet lines. `nearby` escalates through them; the others cycle. */
  lines: readonly string[];
  /** `wanderer` only: where the cat reappears after each pat. */
  spots?: readonly { x: number; y: number }[];
}

// Sprites use the texture key `cat-<id>`; see src/art/CatSprites.ts.
export const villageCats = [
  {
    id: 'nomi', name: 'Nomi', x: 740, y: 530, scale: 1.5, behavior: 'nearby',
    lines: ['Nomi leans into your hand, then sits on your foot. She is staying.', 'Nomi tolerates a second pat. Barely.', 'Nomi has had quite enough. Tail flick. She relocates exactly one metre away.'],
  },
  {
    id: 'miki', name: 'Miki', x: 450, y: 410, scale: 1.9, behavior: 'loud',
    lines: ['Miki melts into a purring loaf. A very loud loaf.', 'MRRRAOW. Translation: more, immediately.', 'Miki headbutts your knee with the force of a small horse.'],
  },
  {
    id: 'viski', name: 'Viski', x: 200, y: 390, scale: 1.5, behavior: 'confused',
    lines: ['Viski headbutts your hand, misses, and headbutts the air instead.', 'Viski stares at a wall with total confidence. The wall is winning.', 'Viski sneezes, looks around, and blames you.'],
  },
  {
    id: 'maks', name: 'Maks', x: 1380, y: 560, scale: 1.45, behavior: 'skittish',
    lines: ['Maks allows exactly one pat, then pretends it never happened.', 'Maks accepts a chin scratch and leaves at full speed.'],
  },
  {
    id: 'maco', name: 'Maco', x: 160, y: 700, scale: 1.5, behavior: 'wanderer',
    lines: ['Maco stares through you into another dimension. Then he is gone.', 'Maco purrs backwards. Somehow.', 'Maco is here now. Nobody saw him arrive.'],
    spots: [{ x: 160, y: 700 }, { x: 640, y: 470 }, { x: 1500, y: 600 }, { x: 1300, y: 260 }, { x: 880, y: 980 }],
  },
] as const satisfies readonly CatDefinition[];

export function getCat(id: string): CatDefinition | undefined {
  return villageCats.find((cat) => cat.id === id);
}

export const villageBuildings = [
  { name: 'Bakery', x: 365, y: 260, width: 100, height: 68, wallColor: 0xb8785f, roofColor: 0x70493e },
  { name: 'Village Hall', x: 220, y: 210, width: 116, height: 78, wallColor: 0xd1b781, roofColor: 0x665341 },
] as const;
