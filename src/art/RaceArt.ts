import Phaser from 'phaser';
import { obstacleShapes, raceThemes, type ObstacleKind, type RaceThemeId } from '../data/race';

export const obstacleKey = (kind: ObstacleKind): string => `race-${kind}`;
export const layerKey = (layer: 'hills' | 'trees' | 'ground', theme: RaceThemeId): string => `race-${layer}-${theme}`;

type Draw = (g: Phaser.GameObjects.Graphics, w: number, h: number) => void;

// Obstacles are drawn bottom-aligned in a canvas slightly larger than their hitbox.
const obstacleArt: Record<ObstacleKind, Draw> = {
  fence: (g, w, h) => {
    g.fillStyle(0x6e4a2e).fillRect(3, 4, 6, h - 4).fillRect(w - 9, 4, 6, h - 4);
    g.fillStyle(0x9a6a40).fillRect(0, 12, w, 7).fillRect(0, 28, w, 7);
    g.fillStyle(0xc8955a).fillRect(0, 12, w, 2).fillRect(0, 28, w, 2).fillStyle(0xe8dcc0).fillRect(2, 2, 8, 3).fillRect(w - 10, 2, 8, 3);
  },
  log: (g, w, h) => {
    g.fillStyle(0x6e4a2e).fillRoundedRect(0, 4, w - 6, h - 4, 10).fillStyle(0x8a5a3a).fillRect(6, 8, w - 18, 4);
    g.lineStyle(2, 0x4a3020).lineBetween(12, h - 6, 24, h - 10).lineBetween(34, 10, 46, 14);
    g.fillStyle(0xd8b07a).fillEllipse(w - 8, h / 2 + 2, 14, h - 6).lineStyle(1, 0x8a5a3a).strokeEllipse(w - 8, h / 2 + 2, 7, (h - 6) / 2);
  },
  puddle: (g, w, h) => {
    g.fillStyle(0x4a7fa8, 0.9).fillEllipse(w / 2, h - 5, w, 10).fillStyle(0x9fd6e8, 0.9).fillEllipse(w / 2 - 12, h - 6, w / 3, 3);
  },
  rock: (g, w, h) => {
    g.fillStyle(0x6a6a74).fillPoints([{ x: 2, y: h }, { x: 6, y: 10 }, { x: 18, y: 2 }, { x: 34, y: 6 }, { x: w - 2, y: h }], true);
    g.fillStyle(0x9a9aa4).fillPoints([{ x: 10, y: 12 }, { x: 18, y: 5 }, { x: 28, y: 8 }, { x: 20, y: 14 }], true);
    g.fillStyle(0x6f9f4f).fillRect(4, h - 6, 10, 4);
  },
  hay: (g, w, h) => {
    g.fillStyle(0xd8b04a).fillRoundedRect(0, 2, w, h - 2, 6).fillStyle(0xf0d070).fillRect(4, 6, w - 8, 4);
    g.lineStyle(3, 0xa0703a).lineBetween(w / 3, 2, w / 3, h).lineBetween(2 * w / 3, 2, 2 * w / 3, h);
    g.lineStyle(1, 0xb08a3a);
    for (let i = 0; i < 8; i++) g.lineBetween(4 + i * 6, 14 + (i % 3) * 8, 8 + i * 6, 18 + (i % 3) * 8);
  },
  stream: (g, w, h) => {
    g.fillStyle(0x3f7fa8).fillRect(0, h - 10, w, 10).fillStyle(0x5aa0c8).fillRect(0, h - 10, w, 3);
    g.fillStyle(0xbfe6f5);
    for (let x = 6; x < w; x += 22) g.fillRect(x, h - 6, 10, 2);
    g.fillStyle(0x8a8a94).fillEllipse(3, h - 4, 8, 6).fillEllipse(w - 3, h - 4, 8, 6);
  },
  branch: (g, w, h) => {
    g.lineStyle(7, 0x6e4a2e).lineBetween(2, h - 4, w - 6, h - 12).lineStyle(3, 0x6e4a2e).lineBetween(30, h - 8, 42, 4).lineBetween(62, h - 10, 72, 6);
    g.fillStyle(0x4f8a4a);
    for (const [x, y] of [[42, 6], [72, 8], [w - 8, h - 14], [18, h - 8]] as const) g.fillCircle(x, y, 6);
  },
};

function generate(scene: Phaser.Scene, key: string, width: number, height: number, draw: Draw): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({}, false);
  draw(g, width, height);
  g.generateTexture(key, width, height);
  g.destroy();
}

/** Obstacle and parallax textures for every track theme; PNGs under the same keys replace them. */
export function ensureRaceTextures(scene: Phaser.Scene): void {
  for (const [kind, shape] of Object.entries(obstacleShapes) as [ObstacleKind, (typeof obstacleShapes)[ObstacleKind]][]) {
    generate(scene, obstacleKey(kind), shape.width + 6, Math.max(shape.height, 12) + 4, obstacleArt[kind]);
  }
  for (const [id, theme] of Object.entries(raceThemes) as [RaceThemeId, (typeof raceThemes)[RaceThemeId]][]) {
    generate(scene, layerKey('hills', id), 512, 160, (g) => {
      g.fillStyle(theme.hills);
      const points = [{ x: 0, y: 160 }];
      for (let x = 0; x <= 512; x += 16) points.push({ x, y: 70 + Math.sin(x / 512 * Math.PI * 4) * 26 + Math.sin(x / 512 * Math.PI * 10) * 8 });
      points.push({ x: 512, y: 160 });
      g.fillPoints(points, true);
    });
    generate(scene, layerKey('trees', id), 512, 220, (g) => {
      const count = Math.round(4 + theme.treeDensity * 6);
      for (let i = 0; i < count; i++) {
        // Kept clear of the tile edges so the repeat has no seam.
        const x = 50 + i * 412 / (count - 1);
        const size = 34 + ((i * 53) % 22);
        g.fillStyle(0x3a2a20).fillRect(x - 4, 220 - size, 8, size);
        g.fillStyle(theme.trees);
        if (theme.treeShape === 'pine') for (let t = 0; t < 3; t++) g.fillTriangle(x - size * 0.7 + t * 6, 220 - size * 0.6 - t * 34, x, 220 - size * 1.7 - t * 34, x + size * 0.7 - t * 6, 220 - size * 0.6 - t * 34);
        else g.fillCircle(x, 220 - size * 1.3, size * 0.8).fillCircle(x - size * 0.5, 220 - size, size * 0.55).fillCircle(x + size * 0.5, 220 - size, size * 0.55);
      }
    });
    generate(scene, layerKey('ground', id), 128, 110, (g) => {
      g.fillStyle(theme.dirt).fillRect(0, 12, 128, 98).fillStyle(theme.grass).fillRect(0, 0, 128, 14);
      g.fillStyle(Phaser.Display.Color.ValueToColor(theme.grass).brighten(12).color);
      for (let x = 2; x < 128; x += 9) g.fillRect(x, 0, 3, 4);
      g.fillStyle(Phaser.Display.Color.ValueToColor(theme.dirt).darken(12).color);
      for (const [x, y] of [[14, 40], [60, 70], [96, 32], [110, 88], [36, 92]] as const) g.fillRect(x, y, 5, 3);
    });
  }
}
