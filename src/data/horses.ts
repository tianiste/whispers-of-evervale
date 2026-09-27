export interface HorseDefinition {
  id: string;
  name: string;
  breed: string;
  coatColor: number;
}

export const firstHorse: HorseDefinition = {
  id: 'brown-quarter-horse',
  name: 'Brown Quarter Horse',
  breed: 'Quarter Horse',
  coatColor: 0x8a4f2d,
};
