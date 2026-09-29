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
  /** Frame in the `riders` sheet. */
  frame: number;
  dialogue: DialogueDefinition;
}

export const villagers = [
  {
    id: 'village-baker', name: 'Village Baker', x: 360, y: 330, frame: 28,
    dialogue: { speaker: 'Village Baker', message: 'Fresh bread for the village. The stable is just down the lane.' },
  },
  {
    id: 'trail-guide', name: 'Trail Guide', x: 250, y: 280, frame: 12,
    dialogue: { speaker: 'Trail Guide', message: 'This little road is an easy ride back to Sunmeadow Stable.' },
  },
  {
    id: 'village-historian', name: 'Village Historian', x: 150, y: 290, frame: 32,
    dialogue: { speaker: 'Village Historian', message: 'Every Evervale record since the founding, and not one camper van. I have checked twice.' },
  },
  {
    id: 'parade-judge', name: 'Madame Rosette', x: 480, y: 300, frame: 16,
    dialogue: { speaker: 'Madame Rosette', message: 'Style is a contact sport. Ask the scarecrow.' },
  },
  {
    id: 'race-steward', name: 'Race Steward', x: 1035, y: 612, frame: 20,
    dialogue: { speaker: 'Race Steward', message: 'Tracks are open. Talk to me whenever you and your horse feel quick.' },
  },
] as const satisfies readonly VillagerDefinition[];

export type VillagerId = (typeof villagers)[number]['id'];

/** The parade's scarecrow, dressed badly on purpose. */
export const scarecrow = { x: 520, y: 292 } as const;

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
  /** Shown in the journal once discovered. */
  note: string;
  /** `wanderer` only: where the cat reappears after each pat. */
  spots?: readonly { x: number; y: number; angle?: number; onTop?: boolean }[];
}

// Sprites use the texture key `cat-<id>`; see src/art/CatSprites.ts.
export const villageCats = [
  {
    id: 'nomi', name: 'Nomi', x: 740, y: 530, scale: 1.5, behavior: 'nearby',
    lines: ['Nomi leans into your hand, then sits on your foot. She is staying.', 'Nomi tolerates a second pat. Barely.', 'Nomi has had quite enough. Tail flick. She relocates exactly one metre away.'],
    note: 'Likes company, within reason.',
  },
  {
    id: 'miki', name: 'Miki', x: 450, y: 410, scale: 1.9, behavior: 'loud',
    lines: ['Miki melts into a purring loaf. A very loud loaf.', 'MRRRAOW. Translation: more, immediately.', 'Miki headbutts your knee with the force of a small horse.'],
    note: 'Loud, fluffy and extremely huggable.',
  },
  {
    id: 'viski', name: 'Viski', x: 200, y: 390, scale: 1.5, behavior: 'confused',
    lines: ['Viski headbutts your hand, misses, and headbutts the air instead.', 'Viski stares at a wall with total confidence. The wall is winning.', 'Viski sneezes, looks around, and blames you.'],
    note: 'Not the brightest. Absolutely perfect.',
  },
  {
    id: 'maks', name: 'Maks', x: 1380, y: 560, scale: 1.45, behavior: 'skittish',
    lines: ['Maks allows exactly one pat, then pretends it never happened.', 'Maks accepts a chin scratch and leaves at full speed.', 'Maks lets you catch him, then acts like it was his idea.'],
    note: 'Runs first, asks questions never.',
  },
  {
    id: 'maco', name: 'Maco', x: 160, y: 700, scale: 1.5, behavior: 'wanderer',
    lines: ['Maco stares through you into another dimension. Then he is gone.', 'Maco purrs backwards. Somehow.', 'Maco is here now. Nobody saw him arrive.'],
    note: 'Found in places cats should not fit.',
    spots: [
      { x: 160, y: 700 },
      { x: 805, y: 440, onTop: true },
      { x: 640, y: 664, angle: 90 },
      { x: 1560, y: 292, angle: 180 },
      { x: 365, y: 226, onTop: true },
      { x: 880, y: 980 },
    ],
  },
] as const satisfies readonly CatDefinition[];

/** The mystery dog at the pond; appears once Echo V is restored. Behavior in src/entities/BoltEntity.ts. */
export const bolt = {
  id: 'bolt',
  name: 'Bolt',
  breed: 'black Flat-Coated Retriever',
  /** Home on the pond's east bank; `water` is where he wades in. */
  x: 335, y: 705,
  water: { x: 230, y: 708 },
  lines: [
    'The tag on his collar says BOLT. He drops a very wet tennis ball at your feet and waits. He has clearly done this before.',
    'Bolt wags so hard his whole back half wags too.',
    'Bolt leans his entire weight against your legs, then sprints back into the pond. Worth it.',
  ],
  note: 'A black Flat-Coated Retriever. Loves water, toys and you. Nobody knows where he came from.',
} as const;

export type AnimalId = CatId | typeof bolt.id;

/** Optional: petting all five cats, in any order, at any point. */
export const catCompletion = {
  reward: 'cat-sweater',
  line: 'All five cats met. You are now officially covered in cat hair. Cat sweater unlocked: O → Accessories.',
  note: 'All five cats met ✓',
} as const;

export function getCat(id: string): CatDefinition | undefined {
  return villageCats.find((cat) => cat.id === id);
}

export const villageBuildings = [
  { name: 'Bakery', x: 365, y: 260, width: 100, height: 68, wallColor: 0xb8785f, roofColor: 0x70493e },
  { name: 'Village Hall', x: 220, y: 210, width: 116, height: 78, wallColor: 0xd1b781, roofColor: 0x665341 },
] as const;
