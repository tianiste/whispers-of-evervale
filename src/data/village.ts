import type { DialogueDefinition } from './dialogue';

export const villageRoute = [
  { x: 690, y: 550 },
  { x: 560, y: 490 },
  { x: 460, y: 390 },
  { x: 360, y: 330 },
  { x: 270, y: 280 },
] as const;

interface VillagerDefinition {
  id: string;
  name: string;
  x: number;
  y: number;
  color: number;
  dialogue: DialogueDefinition;
}

export const villagers = [
  {
    id: 'village-baker', name: 'Village Baker', x: 360, y: 330, color: 0xc98d69,
    dialogue: { speaker: 'Village Baker', message: 'Fresh bread for the village. The stable is just down the lane.' },
  },
  {
    id: 'trail-guide', name: 'Trail Guide', x: 250, y: 280, color: 0x8baf82,
    dialogue: { speaker: 'Trail Guide', message: 'This little road is an easy ride back to Sunmeadow Stable.' },
  },
] as const satisfies readonly VillagerDefinition[];

export const villageCats = [
  { id: 'calico-cat', name: 'Calico Cat', x: 450, y: 410, color: 0xd9a36f },
  { id: 'stable-cat', name: 'Cream Tabby', x: 740, y: 530, color: 0xe6d3ad },
  { id: 'gray-cat', name: 'Gray Cat', x: 200, y: 390, color: 0x999b9b },
] as const;

export const villageBuildings = [
  { name: 'Bakery', x: 365, y: 260, width: 100, height: 68, wallColor: 0xb8785f, roofColor: 0x70493e },
  { name: 'Village Hall', x: 220, y: 210, width: 116, height: 78, wallColor: 0xd1b781, roofColor: 0x665341 },
] as const;
