export type ItemId = 'wildflower' | 'horse-apple';

export interface ItemDefinition {
  id: ItemId;
  name: string;
}

export const items: readonly ItemDefinition[] = [
  { id: 'wildflower', name: 'Wildflower' },
  { id: 'horse-apple', name: 'Horse Apple' },
];
