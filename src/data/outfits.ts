export const outfits = [
  { id: 'meadow', name: 'Meadow', color: 0x7cad70, frame: 0, preview: 'meadow' },
  { id: 'berry', name: 'Berry', color: 0xb96578, frame: 1, preview: 'berry' },
  { id: 'sky', name: 'Sky', color: 0x6f9fc2, frame: 2, preview: 'sky' },
  { id: 'birthday-teal', name: 'Birthday teal', color: 0x55cabb, frame: 2, preview: 'sky' },
] as const;

export type OutfitId = (typeof outfits)[number]['id'];
