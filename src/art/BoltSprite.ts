import Phaser from 'phaser';

type Point = readonly [number, number];

const base = '#16161b';
const mid = '#26262e';
const gloss = '#44444f';

const torsoOutline: Point[] = [
  [6, 17], [4, 12], [6, 8], [11, 6], [18, 5], [24, 5], [27, 4], [30, 5],
  [33, 7], [35, 10], [34, 13], [31, 15], [28, 16], [25, 18], [19, 19], [12, 18], [8, 17],
];
const torsoInner: Point[] = [
  [7, 16], [5, 12], [7, 9], [12, 7], [18, 6], [24, 6], [26, 5], [29, 6],
  [32, 8], [33, 10], [33, 12], [30, 14], [27, 15], [24, 17], [19, 18], [13, 17], [9, 16],
];

/**
 * Bolt's textures: a side-view standing dog facing right, his tail (kept separate so it
 * can rotate around its base to wag) and a tennis ball. A PNG loaded under `bolt`,
 * `bolt-tail` or `bolt-ball` in BootScene replaces the matching generated texture.
 */
export function ensureBoltTextures(scene: Phaser.Scene): void {
  draw(scene, 'bolt', 36, 24, drawBolt);
  draw(scene, 'bolt-tail', 16, 10, drawTail);
  draw(scene, 'bolt-ball', 5, 5, drawBall);
}

function draw(scene: Phaser.Scene, key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, w, h)!;
  const ctx = texture.getContext();
  paint(ctx);
  snapAlpha(ctx, w, h);
  texture.refresh();
}

function fill(ctx: CanvasRenderingContext2D, points: Point[], color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fill();
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawBolt(ctx: CanvasRenderingContext2D): void {
  fill(ctx, torsoOutline, base);
  fill(ctx, torsoInner, mid);
  for (const [x, y, w, h] of [[13, 6, 2, 1], [20, 5, 2, 1], [28, 5, 1, 1]] as const) rect(ctx, x, y, w, h, gloss);
  for (const [x, y] of [[22, 18], [16, 19], [10, 17]] as const) rect(ctx, x, y, 1, 1, base);

  // Feathered ear draping down over the neck.
  rect(ctx, 26, 5, 4, 3, base); rect(ctx, 26, 8, 3, 4, base); rect(ctx, 27, 12, 3, 4, base); rect(ctx, 28, 16, 2, 3, base);
  rect(ctx, 27, 6, 2, 2, mid); rect(ctx, 27, 9, 2, 3, mid); rect(ctx, 28, 13, 1, 3, mid);
  for (const [x, y] of [[25, 9], [25, 13], [29, 18]] as const) rect(ctx, x, y, 1, 1, base);

  rect(ctx, 30, 7, 2, 2, '#7a4f30');
  rect(ctx, 31, 8, 1, 1, '#221510');
  rect(ctx, 34, 9, 2, 2, '#0a0a0d');
  rect(ctx, 29, 13, 5, 2, '#a53535');
  rect(ctx, 30, 15, 2, 2, '#d9b23c');

  // Far pair drawn first, near pair drawn after so they read as the closer legs.
  rect(ctx, 9, 16, 3, 6, base); rect(ctx, 10, 17, 1, 4, mid);
  rect(ctx, 25, 15, 3, 7, base); rect(ctx, 26, 16, 1, 5, mid);
  rect(ctx, 12, 17, 4, 7, base); rect(ctx, 13, 18, 2, 5, mid); rect(ctx, 12, 23, 4, 1, '#0c0c0f');
  rect(ctx, 28, 16, 4, 7, base); rect(ctx, 29, 17, 2, 5, mid); rect(ctx, 28, 23, 4, 1, '#0c0c0f');
  for (const [x, y] of [[8, 18], [11, 20], [24, 17], [27, 19]] as const) rect(ctx, x, y, 1, 1, base);
}

function drawTail(ctx: CanvasRenderingContext2D): void {
  rect(ctx, 0, 3, 5, 4, base); rect(ctx, 5, 4, 4, 3, base); rect(ctx, 9, 4, 3, 3, base); rect(ctx, 12, 4, 3, 2, base);
  rect(ctx, 1, 4, 3, 2, mid); rect(ctx, 6, 4, 2, 2, mid); rect(ctx, 10, 4, 1, 1, mid);
  rect(ctx, 3, 4, 1, 1, gloss);
  for (const [x, y] of [[14, 3], [14, 6], [15, 4]] as const) rect(ctx, x, y, 1, 1, base);
}

function drawBall(ctx: CanvasRenderingContext2D): void {
  rect(ctx, 1, 0, 3, 5, '#c7de52');
  rect(ctx, 0, 1, 5, 3, '#c7de52');
  rect(ctx, 1, 1, 1, 1, '#f4efe6');
  rect(ctx, 2, 2, 1, 1, '#f4efe6');
  rect(ctx, 3, 3, 1, 1, '#f4efe6');
}

function snapAlpha(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const image = ctx.getImageData(0, 0, w, h);
  for (let i = 3; i < image.data.length; i += 4) image.data[i] = image.data[i]! >= 110 ? 255 : 0;
  ctx.putImageData(image, 0, 0);
}
