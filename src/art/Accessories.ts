import Phaser from 'phaser';
import { accessories, type AccessoryId } from '../data/fashion';

type Paint = (rect: (x: number, y: number, w: number, h: number, color: string) => void) => void;

// Drawn on a 32×48 canvas aligned with a rider frame, so the overlay shares its position, scale and flip.
const paints: Record<Exclude<AccessoryId, 'none'>, Paint> = {
  'straw-hat': (rect) => {
    rect(7, 5, 18, 2, '#e2c170'); rect(7, 7, 18, 1, '#9a7b42');
    rect(11, 1, 10, 4, '#d9b35c'); rect(12, 0, 8, 1, '#d9b35c'); rect(11, 4, 10, 1, '#b8554a');
  },
  'teal-scarf': (rect) => {
    rect(11, 19, 11, 3, '#4fb3a3'); rect(12, 19, 9, 1, '#7cd4c4');
    rect(19, 22, 3, 5, '#3f9a8c'); rect(19, 27, 3, 1, '#7cd4c4');
  },
  'riding-helmet': (rect) => {
    rect(10, 2, 12, 5, '#2f3a44'); rect(11, 1, 10, 1, '#2f3a44'); rect(12, 2, 3, 1, '#5a6a78');
    rect(15, 1, 2, 6, '#55cabb'); rect(9, 7, 15, 1, '#1d242c'); rect(21, 6, 4, 2, '#1d242c');
  },
  'flower-crown': (rect) => {
    rect(10, 5, 12, 1, '#5a9a5a');
    for (const [x, color] of [[10, '#f2a8c0'], [13, '#fff1b8'], [16, '#55cabb'], [19, '#f2a8c0'], [21, '#fff1b8']] as const) {
      rect(x, 3, 2, 2, color); rect(x, 5, 1, 1, '#3f7a3f');
    }
  },
  // A teal knit with a little black cat on the front; overlaps the torso of every rider frame.
  'cat-sweater': (rect) => {
    rect(10, 21, 12, 9, '#4fb3a3'); rect(8, 22, 2, 6, '#4fb3a3'); rect(22, 22, 2, 6, '#4fb3a3');
    rect(12, 21, 8, 1, '#f4efe6'); rect(10, 29, 12, 1, '#3f9a8c'); rect(8, 27, 2, 1, '#3f9a8c'); rect(22, 27, 2, 1, '#3f9a8c');
    rect(14, 24, 4, 3, '#1d1a22'); rect(14, 23, 1, 1, '#1d1a22'); rect(17, 23, 1, 1, '#1d1a22');
    rect(15, 25, 1, 1, '#b9d36a'); rect(17, 25, 1, 1, '#b9d36a');
  },
};

export const accessoryKey = (id: AccessoryId): string => `accessory-${id}`;

/** Accessory overlays, drawn once at boot; a PNG loaded under the same key replaces one. */
export function ensureAccessoryTextures(scene: Phaser.Scene): void {
  for (const { id } of accessories) {
    if (id === 'none' || scene.textures.exists(accessoryKey(id))) continue;
    const texture = scene.textures.createCanvas(accessoryKey(id), 32, 48)!;
    const ctx = texture.getContext();
    paints[id]((x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); });
    texture.refresh();
  }
}
