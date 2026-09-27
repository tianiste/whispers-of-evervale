export type HorseId = 'brown-quarter-horse' | 'gray-mustang' | 'dark-bay-friesian';

export interface HorseDefinition {
  id: HorseId;
  name: string;
  breed: string;
  coatColor: number;
}

export const horses: readonly HorseDefinition[] = [
  { id: 'brown-quarter-horse', name: 'Maple', breed: 'Quarter Horse', coatColor: 0x8a4f2d },
  { id: 'gray-mustang', name: 'Silver', breed: 'Mustang', coatColor: 0xaaa9a3 },
  { id: 'dark-bay-friesian', name: 'Raven', breed: 'Friesian', coatColor: 0x382c2b },
];

export const firstHorse = horses[0]!;

export function getHorse(id: HorseId | undefined): HorseDefinition {
  return horses.find((horse) => horse.id === id) ?? firstHorse;
}
