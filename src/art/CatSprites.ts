import Phaser from 'phaser';
import type { CatId } from '../data/village';

interface CatLook {
  body: string;
  ink: string;
  eyes: [string, string];
  nose: string;
  chest?: string;
  blaze?: boolean;
  spot?: string;
  fluffy?: boolean;
  slim?: boolean;
  /** One eye a pixel lower. */
  derp?: boolean;
}

const black = '#2b2a31';
const deepInk = '#111015';
const white = '#f1ede4';

const looks: Record<CatId, CatLook> = {
  nomi: { body: black, ink: deepInk, eyes: ['#b9d36a', '#b9d36a'], nose: '#6b4b4b', chest: white, blaze: true, fluffy: true },
  miki: { body: '#25242b', ink: deepInk, eyes: ['#e8b64a', '#e8b64a'], nose: '#5a4448', fluffy: true },
  viski: { body: black, ink: deepInk, eyes: ['#c8d860', '#c8d860'], nose: '#b16f69', chest: white, blaze: true, derp: true },
  maks: { body: black, ink: deepInk, eyes: ['#9fd86a', '#9fd86a'], nose: '#b16f69', chest: white, slim: true },
  maco: { body: white, ink: '#57525a', eyes: ['#6aa0d8', '#d8c050'], nose: '#d08c86', spot: black },
};

type Point = readonly [number, number];
const outline: Point[] = [[5, 20], [5, 13], [8, 10], [7, 3], [11, 6], [16, 5], [20, 2], [20, 14], [18, 20]];
const body: Point[] = [[7, 19], [7, 13], [10, 11], [9, 6], [12, 8], [16, 7], [18, 5], [18, 15], [16, 19]];
const narrow = (points: Point[]): Point[] => points.map(([x, y]) => [x > 15 ? x - 1 : x, y]);

/**
 * Seated 24×24 cats matching the original sheet's silhouette. A PNG loaded under
 * `cat-<id>` in BootScene takes precedence, so real sprites can replace these directly.
 */
export function ensureCatTextures(scene: Phaser.Scene): void {
  for (const [id, look] of Object.entries(looks)) {
    const key = `cat-${id}`;
    if (scene.textures.exists(key)) continue;
    const texture = scene.textures.createCanvas(key, 24, 24)!;
    drawCat(texture.getContext(), look);
    texture.refresh();
  }
}

function drawCat(ctx: CanvasRenderingContext2D, look: CatLook): void {
  const fill = (points: Point[], color: string, dx = 0, dy = 0): void => {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x, y], index) => index ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy));
    ctx.closePath();
    ctx.fill();
  };
  const rect = (x: number, y: number, w: number, h: number, color: string): void => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  const shape = look.slim ? narrow(outline) : outline;
  const inner = look.slim ? narrow(body) : body;

  ctx.strokeStyle = look.ink;
  ctx.lineWidth = look.fluffy ? 4 : 3;
  ctx.beginPath(); ctx.moveTo(6, 19); ctx.lineTo(2, 18); ctx.lineTo(2, 14); ctx.lineTo(3, 12); ctx.stroke();
  if (look.fluffy) for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1]] as const) fill(shape, look.ink, dx, dy);
  fill(shape, look.ink);
  fill(inner, look.body);
  ctx.strokeStyle = look.body;
  ctx.lineWidth = look.fluffy ? 2.5 : 1.5;
  ctx.beginPath(); ctx.moveTo(6, 19); ctx.lineTo(2.5, 18); ctx.lineTo(2.5, 14); ctx.lineTo(3.5, 12.5); ctx.stroke();
  if (look.chest) {
    rect(10, 14, look.slim ? 5 : 7, 6, look.chest);
    rect(9, 19, 3, 1, look.chest);
    rect(look.slim ? 13 : 14, 19, 3, 1, look.chest);
    if (look.fluffy) { rect(9, 15, 1, 2, look.chest); rect(look.slim ? 15 : 17, 15, 1, 2, look.chest); }
  }
  if (look.blaze) rect(13, 9, 2, 4, look.chest ?? white);
  if (look.spot) { rect(14, 6, 4, 3, look.spot); rect(15, 5, 2, 1, look.spot); }
  rect(10, 10, 2, 2, look.eyes[0]);
  rect(look.slim ? 15 : 16, look.derp ? 11 : 10, 2, 2, look.eyes[1]);
  rect(10, 10, 1, 1, deepInk);
  rect(look.slim ? 16 : 17, look.derp ? 11 : 10, 1, 1, deepInk);
  rect(13, 13, 2, 1, look.nose);
  rect(12, 16, 1, 4, look.chest ? '#c9c2b4' : look.ink);

  // Canvas paths antialias; snap coverage back to hard pixel edges.
  const image = ctx.getImageData(0, 0, 24, 24);
  for (let i = 3; i < image.data.length; i += 4) image.data[i] = image.data[i]! >= 110 ? 255 : 0;
  ctx.putImageData(image, 0, 0);
}
