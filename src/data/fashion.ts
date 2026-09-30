import type { ItemId } from './items';
import type { OutfitId } from './outfits';

export type StyleTag = 'countryside' | 'blue-green' | 'race-day' | 'cozy' | 'bold' | 'fancy' | 'sunny';
export type AccessoryId = 'none' | 'straw-hat' | 'teal-scarf' | 'riding-helmet' | 'flower-crown' | 'cat-sweater';

export interface AccessoryDefinition {
  id: AccessoryId;
  name: string;
  tags: readonly StyleTag[];
  /** Owning this item makes the accessory wearable; others are in the wardrobe from the start. */
  unlockItem?: ItemId;
}

// Textures are generated under `accessory-<id>` (src/art/Accessories.ts), drawn over the rider frame.
export const accessories: readonly AccessoryDefinition[] = [
  { id: 'none', name: 'No accessory', tags: [] },
  { id: 'straw-hat', name: 'Straw hat', tags: ['countryside', 'sunny'] },
  { id: 'teal-scarf', name: 'Teal scarf', tags: ['blue-green', 'cozy'] },
  { id: 'riding-helmet', name: 'Riding helmet', tags: ['race-day'] },
  { id: 'flower-crown', name: 'Flower crown', tags: ['countryside', 'fancy'], unlockItem: 'flower-crown' },
  { id: 'cat-sweater', name: 'Cat sweater', tags: ['cozy', 'blue-green'], unlockItem: 'cat-sweater' },
];

export const outfitTags: Record<OutfitId, readonly StyleTag[]> = {
  meadow: ['countryside'],
  berry: ['cozy', 'bold'],
  sky: ['blue-green', 'race-day'],
  'birthday-teal': ['blue-green', 'fancy'],
};

export const tagLabels: Record<StyleTag, string> = {
  countryside: 'Countryside', 'blue-green': 'Blue-green', 'race-day': 'Race day', cozy: 'Cozy', bold: 'Bold', fancy: 'Fancy', sunny: 'Sunny',
};

export interface ParadeRound {
  id: string;
  theme: string;
  hint: string;
  tag: StyleTag;
  pass: string;
}

// Any equipped piece carrying the round's tag passes; there is never one required outfit.
export const styleParade = {
  judge: 'Madame Rosette',
  intro: 'Welcome to the Sunmeadow Style Parade. Three themes, one very short runway. Before we begin, look at that scarecrow. Absolutely horrid, darling. Learn from his mistakes.',
  rounds: [
    { id: 'countryside', theme: 'Countryside rider', hint: 'Something that belongs on a farm lane.', tag: 'countryside', pass: 'Hay-bale chic. The horses nod in approval.' },
    { id: 'blue-green', theme: 'Something blue-green', hint: 'Teal, sea-glass, duck egg. You know the colour.', tag: 'blue-green', pass: 'Yes. That colour was made for you.' },
    { id: 'race-day', theme: 'Race-day look', hint: 'Ready for the starting line.', tag: 'race-day', pass: 'Fast, safe and fabulous. The scarecrow is jealous.' },
  ] as const satisfies readonly ParadeRound[],
  misses: ['Bold. Wrong theme, but bold.', 'The scarecrow is smirking at you. Try again.', 'Lovely look. For a different parade.'],
  reward: 'flower-crown' as ItemId,
  finale: 'Three themes, three triumphs. A flower crown for the winner — and please, never tell the scarecrow.',
} as const;
