import type { ItemId } from './items';

export type DecorationId = 'flower-box' | 'lantern' | 'wreath' | 'echo-lantern' | 'teal-posy'
  | 'glow-sticks' | 'phone-charm' | 'banjole-shell' | 'foil-tray' | 'banca-card' | 'spare-key' | 'cat-bed';

export interface DecorationDefinition {
  id: DecorationId;
  name: string;
  symbol: string;
  color: string;
  /** Owning this item makes the decoration selectable. */
  unlockItem?: ItemId;
}

export const decorations = [
  { id: 'teal-posy', name: 'Teal flower pot', symbol: '✿', color: '#55cabb', unlockItem: 'teal-posy' },
  { id: 'echo-lantern', name: 'Birthday Echo lantern', symbol: '✦', color: '#77ffe0', unlockItem: 'echo-tack' },
  { id: 'glow-sticks', name: 'Purple glow sticks', symbol: '✧', color: '#c07bff', unlockItem: 'echo-glowstick' },
  { id: 'phone-charm', name: 'Phone charm chime', symbol: '☎', color: '#ffc861', unlockItem: 'echo-phone-charm' },
  { id: 'banjole-shell', name: 'Banjole seashell', symbol: '✺', color: '#f3e0b8', unlockItem: 'echo-seashell' },
  { id: 'foil-tray', name: 'Framed foil lasagne tray', symbol: '▣', color: '#dfe6ea', unlockItem: 'echo-foil-tray' },
  { id: 'banca-card', name: 'Framed Banca holo card', symbol: '❖', color: '#ffd98a', unlockItem: 'echo-banca-card' },
  { id: 'spare-key', name: 'Spare key on a teal keyring', symbol: '⚷', color: '#77ffe0', unlockItem: 'echo-spare-key' },
  { id: 'cat-bed', name: 'Cat bed for five', symbol: '♥', color: '#f2a8c0', unlockItem: 'cat-bed' },
  { id: 'flower-box', name: 'Flower box', symbol: '✿', color: '#e89caf' },
  { id: 'lantern', name: 'Lantern', symbol: '✦', color: '#f2c66d' },
  { id: 'wreath', name: 'Wreath', symbol: '❀', color: '#9fca8e' },
] as const satisfies readonly DecorationDefinition[];

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
