export type ItemId = 'wildflower' | 'horse-apple' | 'berry-gift' | 'echo-fragment' | 'echo-tack' | 'teal-posy'
  | 'echo-glowstick' | 'echo-phone-charm' | 'echo-seashell';

export interface ItemDefinition {
  id: ItemId;
  name: string;
}

export const items: readonly ItemDefinition[] = [
  { id: 'teal-posy', name: 'Teal flower pot · stable decoration' },
  { id: 'berry-gift', name: 'Berry outfit gift' },
  { id: 'echo-glowstick', name: 'Glow stick keepsake · Echo I' },
  { id: 'echo-phone-charm', name: 'Phone charm keepsake · Echo II' },
  { id: 'echo-seashell', name: 'Banjole seashell · Echo III' },
  { id: 'echo-fragment', name: 'Echo fragment' },
  { id: 'echo-tack', name: 'Birthday teal bridle ribbon' },
  { id: 'wildflower', name: 'Wildflower' },
  { id: 'horse-apple', name: 'Horse Apple' },
];
