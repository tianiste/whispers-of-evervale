export type HorseId = 'brown-quarter-horse' | 'gray-mustang' | 'dark-bay-friesian';

export interface HorseDefinition {
  id: HorseId;
  /** Suggested name, pre-filled in the choice dialog. */
  name: string;
  breed: string;
  coat: string;
  blurb: string;
  coatColor: number;
}

export const horses: readonly HorseDefinition[] = [
  { id: 'brown-quarter-horse', name: 'Sky', breed: 'Quarter Horse', coat: 'Warm brown', blurb: 'Steady, quick on the turns and very good at looking cute for apples.', coatColor: 0x8a4f2d },
  { id: 'gray-mustang', name: 'Silver', breed: 'Mustang', coat: 'Dapple gray', blurb: 'Curious and brave. Will personally investigate every bush.', coatColor: 0xaaa9a3 },
  { id: 'dark-bay-friesian', name: 'Raven', breed: 'Friesian', coat: 'Dark bay', blurb: 'Dramatic mane, gentle soul, excellent posture.', coatColor: 0x382c2b },
];

export const firstHorse = horses[0]!;
export const HORSE_NAME_MAX = 16;

export function getHorse(id: HorseId | undefined): HorseDefinition {
  return horses.find((horse) => horse.id === id) ?? firstHorse;
}

/** Player-entered names are shown in HTML and saved; keep them short, single-line and tag-free. */
export function cleanHorseName(value: string): string {
  return value.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, HORSE_NAME_MAX).trim();
}
