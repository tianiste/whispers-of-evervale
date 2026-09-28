export type DecorationId = 'flower-box' | 'lantern' | 'wreath' | 'echo-lantern' | 'teal-posy';

export const decorations = [
  { id: 'teal-posy', name: 'Teal flower pot', symbol: '✿', color: '#55cabb' },
  { id: 'echo-lantern', name: 'Birthday Echo lantern', symbol: '✦', color: '#77ffe0' },
  { id: 'flower-box', name: 'Flower box', symbol: '✿', color: '#e89caf' },
  { id: 'lantern', name: 'Lantern', symbol: '✦', color: '#f2c66d' },
  { id: 'wreath', name: 'Wreath', symbol: '❀', color: '#9fca8e' },
] as const satisfies readonly { id: DecorationId; name: string; symbol: string; color: string }[];

interface StableDecorationSlot {
  id: string;
  name: string;
  x: number;
  y: number;
  defaultDecorationId: DecorationId;
}

export const stableDecorationSlots = [
  { id: 'window', name: 'Window', x: -70, y: 75, defaultDecorationId: 'flower-box' },
  { id: 'door', name: 'Door', x: 0, y: 75, defaultDecorationId: 'lantern' },
  { id: 'sign', name: 'Sign', x: 70, y: 75, defaultDecorationId: 'wreath' },
] as const satisfies readonly StableDecorationSlot[];

export type StableDecorationSlotId = (typeof stableDecorationSlots)[number]['id'];
