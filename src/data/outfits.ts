export const outfits = [
  { id: 'meadow', name: 'Meadow', color: 0x7cad70 },
  { id: 'berry', name: 'Berry', color: 0xb96578 },
  { id: 'sky', name: 'Sky', color: 0x6f9fc2 },
] as const;

export type OutfitId = (typeof outfits)[number]['id'];
