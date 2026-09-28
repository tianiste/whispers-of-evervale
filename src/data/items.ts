export type ItemId = 'wildflower' | 'horse-apple' | 'berry-gift' | 'echo-fragment' | 'echo-tack' | 'teal-posy';

export interface ItemDefinition {
  id: ItemId;
  name: string;
}

export const items: readonly ItemDefinition[] = [
  { id: 'teal-posy', name: 'Teal flower pot · stable decoration' },
  { id: 'berry-gift', name: 'Berry outfit gift' },
  { id: 'echo-fragment', name: 'Echo fragment' },
  { id: 'echo-tack', name: 'Birthday teal bridle ribbon' },
  { id: 'wildflower', name: 'Wildflower' },
  { id: 'horse-apple', name: 'Horse Apple' },
];
