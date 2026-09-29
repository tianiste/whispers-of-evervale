export type ItemId = 'wildflower' | 'horse-apple' | 'berry-gift' | 'echo-fragment' | 'echo-tack' | 'teal-posy'
  | 'echo-glowstick' | 'echo-phone-charm' | 'echo-seashell' | 'echo-foil-tray' | 'echo-banca-card'
  | 'flower-crown' | 'forest-rosette' | 'echo-spare-key' | 'cat-bed' | 'cat-sweater';

export interface ItemDefinition {
  id: ItemId;
  name: string;
}

export const items: readonly ItemDefinition[] = [
  { id: 'teal-posy', name: 'Teal flower pot · stable decoration' },
  { id: 'berry-gift', name: 'Berry outfit gift' },
  { id: 'flower-crown', name: 'Flower crown · accessory' },
  { id: 'forest-rosette', name: 'Forest Run rosette · tack' },
  { id: 'echo-glowstick', name: 'Glow stick keepsake · Echo I' },
  { id: 'echo-phone-charm', name: 'Phone charm keepsake · Echo II' },
  { id: 'echo-seashell', name: 'Banjole seashell · Echo III' },
  { id: 'echo-foil-tray', name: 'Foil lasagne tray · Echo IV' },
  { id: 'echo-banca-card', name: 'Banca holo card · Echo V' },
  { id: 'echo-spare-key', name: 'Spare key on a teal keyring · Echo VI' },
  { id: 'cat-bed', name: 'Cat bed for five · stable decoration' },
  { id: 'cat-sweater', name: 'Cat sweater · accessory' },
  { id: 'echo-fragment', name: 'Echo fragment' },
  { id: 'echo-tack', name: 'Teal & oak birthday tack set' },
  { id: 'wildflower', name: 'Wildflower' },
  { id: 'horse-apple', name: 'Horse Apple' },
];
