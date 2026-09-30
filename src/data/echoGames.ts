// Text and tuning for the Echo IV–V canvas minigames. Logic and drawing live in src/minigames.

export type HolidayIcon = 'walk' | 'phone' | 'pan' | 'taco';

export const holidayMap = {
  hint: 'Drag each part of the day onto the map.',
  /** Each activity belongs to the place on the same row. */
  places: [
    { activity: 'Daily walks', icon: 'walk', place: 'The seaside promenade' },
    { activity: 'The creature game', icon: 'phone', place: 'All around the old town' },
    { activity: 'Cooking together', icon: 'pan', place: 'The tiny kitchen' },
    { activity: 'Tacos', icon: 'taco', place: 'The balcony table' },
  ] as const satisfies readonly { activity: string; icon: HolidayIcon; place: string }[],
  misses: ['Tacos on the promenade? Bold. Sandy, but bold.', 'That happened somewhere else. Probably.', 'The map disagrees politely.'],
} as const;

export type CreatureLook = 'gull' | 'bun' | 'jelly';

// Original creatures only; nothing here should resemble an existing franchise.
export const creatureCatch = {
  hint: 'Click a creature to throw a catch-orb.',
  goal: 3,
  creatures: [
    { name: 'Gullpuff', look: 'gull', body: 0xf4f1ea, accent: 0xf2a33a },
    { name: 'Sandbun', look: 'bun', body: 0xe2c28a, accent: 0xf3e6cf },
    { name: 'Fizzlet', look: 'jelly', body: 0x5ed6c6, accent: 0xbff8ec },
  ] as const satisfies readonly { name: string; look: CreatureLook; body: number; accent: number }[],
  misses: ['The orb bounces off a pigeon. The pigeon is unbothered.', 'Missed! It hopped away giggling.', 'So close. Tian claims it was lag.'],
  steps: 'Steps today',
} as const;

export const foilTray = {
  hints: {
    fold: 'Drag each side of the foil up to make a wall.',
    pinch: 'Click the four corners to pinch them shut.',
    layer: 'Add the layers: pasta, sauce, cheese.',
  },
  springBack: 'Boing. One corner has changed its mind.',
  layers: [
    { name: 'Pasta', color: 0xf2d98a },
    { name: 'Sauce', color: 0xc8503a },
    { name: 'Cheese', color: 0xfff1b8 },
  ],
  stamp: ['STRUCTURAL INTEGRITY: QUESTIONABLE', 'LASAGNE COMPATIBILITY: ACCEPTABLE'],
} as const;

export interface CollectibleCard {
  name: string;
  kind: string;
  ability: string;
  /** Card face colours: frame, art background. */
  colors: readonly [number, number];
  holo?: true;
}

// Parody cards with original names and art; no official card layout or artwork.
export const cardPack = {
  hints: {
    open: 'Drag across the top of the pack to tear it open.',
    flip: 'Click each card to flip it.',
    give: 'Pick a card to give to Tian.',
  },
  packName: 'EVERVALE CRITTERS · 3 CARDS',
  cards: [
    { name: 'Frostfox', kind: 'Snow', ability: 'Flurry Tail · makes everyone’s socks wet.', colors: [0x8fb8e8, 0xe8f4ff] },
    { name: 'Pudding Toad', kind: 'Snack', ability: 'Wobble · cannot be taken seriously.', colors: [0xd8a04a, 0xfff0c8] },
    { name: 'Banca', kind: 'Sunshine', ability: 'Annoyed First · always acts before Tian. His next joke is cancelled.', colors: [0x55cabb, 0xfff4d8], holo: true },
  ] as const satisfies readonly CollectibleCard[],
  giveLines: ['Tian pretends to be cool about it. He is not cool about it.', 'Tian: “For me? Rare pull.” He puts it in a sleeve immediately.', 'A good card. A better present.'],
  occasions: ['Christmas Eve', 'Birthday', 'Just because', 'Valentine’s', 'A bad day', 'Another Christmas'],
} as const;

export const snowball = {
  hints: {
    throw: 'Aim with the mouse and click to throw. Space to duck.',
  },
  goal: 4,
  /** Maj being Maj, in rotation. */
  majLines: ['Maj: “Missed me!” (He was hit.)', 'Maj does a victory dance anyway.', 'Maj eats a bit of snow. For science.', 'Maj: “Truce?” It was not a truce.'],
  hitHana: ['Splat! Right in the hood.', 'Maj has excellent aim and no remorse.', 'Snow down the collar. Classic Maj.'],
  ducked: 'Ducked! Maj looks personally offended.',
  finale: 'And then, for no reason at all, everyone throws themselves into the snow.',
} as const;

export const orehi = {
  hints: {
    prepare: 'Click the ingredients to add them to the bowl.',
    shape: 'Click each mould to press in the dough.',
    bake: 'Click Stop when the cookies look golden.',
    fill: 'Click each shell to fill it with Nutella.',
  },
  ingredients: ['Flour', 'Butter', 'Sugar', 'Egg'],
  molds: 6,
  bake: { tooEarly: 'Still pale. The oven needs a little more time.', tooLate: 'A little extra toasty. Tian calls it “caramelised”. Try again.', golden: 'Golden. Perfect.' },
  done: 'Six little walnuts, Nutella in the middle.',
} as const;

export type FutureSpotId = 'nomi' | 'miki' | 'maks' | 'maco' | 'viski' | 'bolt' | 'hana' | 'tian'
  | 'picture' | 'tv' | 'phone' | 'takeout' | 'figure' | 'trophy' | 'blocks';

export interface FutureSpot {
  id: FutureSpotId;
  /** Click area centre and size on the 960×540 stage; src/art/EchoStages.ts draws the room around these. */
  x: number;
  y: number;
  width: number;
  height: number;
  animal?: true;
  caption: string;
  /** Maks: the first click sends him here instead of counting. */
  flee?: { x: number; y: number; caption: string };
}

// Echo VI's apartment. Shared games are only hinted at: no franchise names, logos or characters.
export const futureHome = {
  hint: 'Look around and click anything that feels like home.',
  hintReady: 'Keep looking, or move on when you’re ready.',
  /** Finding this many things offers the way on; finding every animal moves on by itself. */
  enough: 4,
  moveOn: 'That’s home',
  everyone: 'Everyone’s here.',
  spots: [
    { id: 'nomi', x: 640, y: 248, width: 64, height: 52, animal: true, caption: 'Nomi, on the arm of the couch. Close enough to supervise, far enough not to be bothered.' },
    { id: 'miki', x: 464, y: 284, width: 64, height: 56, animal: true, caption: 'Miki is pressed against Hana like a warm, very loud sandbag. He will not be moving.' },
    {
      id: 'maks', x: 590, y: 438, width: 64, height: 44, animal: true, caption: 'Caught him. Maks still runs away, and he still comes back for dinner.',
      flee: { x: 846, y: 446, caption: 'Maks spots you and bolts behind the plant. Some things never change.' },
    },
    { id: 'maco', x: 913, y: 80, width: 76, height: 40, animal: true, caption: 'Maco is lying upside down on top of the bookshelf. Nobody saw him climb up. Nobody ever does.' },
    { id: 'viski', x: 700, y: 424, width: 60, height: 48, animal: true, caption: 'Viski walks straight into the TV stand, looks around and blames the TV stand.' },
    { id: 'bolt', x: 330, y: 426, width: 104, height: 56, animal: true, caption: 'Bolt, black and shiny and still damp from the water bowl. He brought you his toy. He will bring it again in ten seconds.' },
    { id: 'hana', x: 398, y: 264, width: 50, height: 72, caption: 'Tian is telling a joke from the kitchen. Hana is annoyed first. She is always annoyed first.' },
    { id: 'tian', x: 178, y: 292, width: 56, height: 128, caption: 'Tian is cooking. Obviously. The kitchen smells of garlic and questionable confidence.' },
    { id: 'picture', x: 480, y: 146, width: 156, height: 124, caption: '{horse}, framed above the couch, looking extremely pleased about it.' },
    { id: 'tv', x: 780, y: 250, width: 140, height: 94, caption: 'An anime, paused right on the dramatic bit. Nobody remembers pausing it. Everybody remembers the episode.' },
    { id: 'phone', x: 540, y: 364, width: 48, height: 28, caption: 'A creature-catching game, paused mid-walk. A Gullpuff is nearby. It is always a Gullpuff.' },
    { id: 'takeout', x: 244, y: 254, width: 50, height: 42, caption: 'A burger bag from the place down the road: two meals, extra fries and an argument about who ate the last nugget.' },
    { id: 'figure', x: 896, y: 184, width: 34, height: 44, caption: 'A sleek space-ninja figure. Tian says it is for display only. It has clearly been played with.' },
    { id: 'trophy', x: 932, y: 184, width: 34, height: 44, caption: '“#1 of 100.” Won exactly once. We do not talk about the other ninety-nine games.' },
    { id: 'blocks', x: 842, y: 310, width: 40, height: 38, caption: 'A block-built model of this very apartment, one cube at a time. Accurate, apart from the moat.' },
  ] as const satisfies readonly FutureSpot[],
  /** The picture's caption when the horse is called Sky. */
  skyCaption: 'Sky, framed above the couch. Some names just fit.',
  /** Speech bubbles the stage plays when Hana or Tian is clicked. Baber appears only here. */
  joke: ['Why did the horse cross the road?', '…To visit his neigh-bours.', 'No.'],
  dinner: ['Dinner in five, Baber.', 'Is it foil-tray lasagne?', '…It might be foil-tray lasagne.'],
  catLines: { nomi: '…hmph.', miki: 'MRRRAOW', maks: '…fine.', maco: '?', viski: 'bonk' },
} as const;
