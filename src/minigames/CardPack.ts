// Test hooks (direct children of `layer`): 'tear-strip', 'card-0', 'card-1', 'card-2'.
import Phaser from 'phaser';
import { cardPack, type CollectibleCard } from '../data/echoGames';
import { figureKey } from '../art/EchoFigures';
import { tone } from '../systems/tones';
import { burst, createLayer, floatText, GameScope, glow, text, WIDTH, HEIGHT, type Minigame } from './Minigame';

const ADD = Phaser.BlendModes.ADD;
const CARD_W = 150;
const CARD_H = 210;
const PACK_X = WIDTH / 2;
const PACK_Y = 280;
const FAN_Y = 350;
const FAN_X = [330, 480, 630];
const FAN_ANGLE = [-7, 0, 7];

/** Points of a spiky star/compass rose centred at (cx, cy). */
function starPoints(cx: number, cy: number, spikes: number, outerR: number, innerR: number): Phaser.Math.Vector2[] {
  const points: Phaser.Math.Vector2[] = [];
  const step = Math.PI / spikes;
  let angle = -Math.PI / 2;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    points.push(new Phaser.Math.Vector2(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r));
    angle += step;
  }
  return points;
}

function buildBackdrop(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, calm: boolean): void {
  const add = <T extends Phaser.GameObjects.GameObject>(object: T): T => { layer.add(object); return object; };

  add(scene.add.rectangle(WIDTH / 2, 200, WIDTH, 400, 0x5b4436));
  add(scene.add.rectangle(WIDTH / 2, 470, WIDTH, 140, 0x342519));
  add(scene.add.ellipse(WIDTH / 2, 478, 520, 108, 0x8a2f2f)).setStrokeStyle(3, 0xf1ece0, 0.6);

  const winX = 712, winY = 150, winW = 190, winH = 170;
  add(scene.add.rectangle(winX, winY, winW + 16, winH + 16, 0x3a2a1e));
  add(scene.add.rectangle(winX, winY, winW, winH, 0x0b1630));
  add(scene.add.rectangle(winX, winY + winH / 2 + 10, winW + 30, 14, 0x3a2a1e));
  const stars = scene.add.graphics().fillStyle(0xf4efd8, 0.8);
  for (let i = 0; i < 8; i++) stars.fillRect(winX - winW / 2 + 8 + (i * 53) % (winW - 16), winY - winH / 2 + 8 + (i * 37) % (winH - 60), 2, 2);
  add(stars);
  const mullions = scene.add.graphics().lineStyle(4, 0x3a2a1e);
  mullions.lineBetween(winX, winY - winH / 2, winX, winY + winH / 2);
  mullions.lineBetween(winX - winW / 2, winY, winX + winW / 2, winY);
  add(mullions);
  for (let i = 0; i < 18; i++) {
    const flake = add(scene.add.rectangle(
      winX - winW / 2 + 6 + Math.random() * (winW - 12),
      winY - winH / 2 + Math.random() * winH,
      2, 2, 0xffffff, 0.85,
    ));
    scene.tweens.add({
      targets: flake,
      y: winY + winH / 2 + 6,
      duration: (calm ? 6500 : 3400) + Math.random() * 1800,
      delay: Math.random() * 3000,
      repeat: -1,
      onRepeat: () => { flake.y = winY - winH / 2 - 6; flake.x = winX - winW / 2 + 6 + Math.random() * (winW - 12); },
    });
  }

  const treeX = 108, baseY = 375;
  const tree = scene.add.graphics().fillStyle(0x1f4a34, 1);
  tree.fillTriangle(treeX, baseY - 90, treeX - 45, baseY, treeX + 45, baseY);
  tree.fillTriangle(treeX, baseY - 130, treeX - 34, baseY - 45, treeX + 34, baseY - 45);
  tree.fillTriangle(treeX, baseY - 165, treeX - 24, baseY - 90, treeX + 24, baseY - 90);
  add(tree);
  add(scene.add.rectangle(treeX, baseY + 13, 16, 26, 0x5a3a22));
  const starPts = starPoints(treeX, baseY - 172, 5, 12, 5);
  add(scene.add.graphics().fillStyle(0xffd86a, 1).fillPoints(starPts, true));
  add(glow(scene, treeX, baseY - 90, 0xffcf5c, 1.8, 0.16));
  const bulbColors = [0xff9ab8, 0xffd86a, 0x8ff0ff, 0xffffff];
  const bulbSpots = [[85, 350], [128, 335], [95, 300], [138, 290], [82, 255], [130, 240], [100, 220], [116, 205]] as const;
  const bulbs = bulbSpots.map(([x, y], i) => add(scene.add.circle(x, y, 3, bulbColors[i % bulbColors.length] ?? 0xffffff)));
  scene.tweens.add({ targets: bulbs, alpha: 0.3, duration: calm ? 1400 : 700, yoyo: true, repeat: -1, delay: scene.tweens.stagger(90, {}) });

  add(scene.add.rectangle(230, 470, 26, 70, 0x4a3323));
  add(scene.add.rectangle(730, 470, 26, 70, 0x4a3323));
  add(scene.add.rectangle(WIDTH / 2, 400, 560, 20, 0x6b4a34)).setStrokeStyle(2, 0x8a6a4a);
}

/** Original teal-and-gold card back with a compass-star mark. */
function buildCardBack(scene: Phaser.Scene, w: number, h: number): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(0x1f6f63, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 10);
  g.lineStyle(1, 0x2f9686, 0.5);
  for (let i = -4; i <= 4; i++) g.lineBetween(-w / 2, i * (h / 9), w / 2, i * (h / 9) - h / 5);
  g.lineStyle(3, 0xd8b34a, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
  const compass = starPoints(0, 0, 8, w * 0.24, w * 0.11);
  g.fillStyle(0xd8b34a, 0.9).fillPoints(compass, true);
  g.lineStyle(2, 0xfdf6e3, 0.8).strokePoints(compass, true);
  return scene.add.container(0, 0, [g]);
}

function drawFrostfox(g: Phaser.GameObjects.Graphics, cx: number, cy: number, w: number, h: number): void {
  const r = Math.min(w, h) / 2;
  g.fillStyle(0xffffff, 0.95).fillTriangle(cx, cy - r, cx - r * 0.8, cy + r * 0.7, cx + r * 0.8, cy + r * 0.7);
  g.fillStyle(0xe8f4ff, 1);
  g.fillTriangle(cx - r * 0.55, cy - r * 0.9, cx - r * 0.85, cy - r * 0.15, cx - r * 0.2, cy - r * 0.35);
  g.fillTriangle(cx + r * 0.55, cy - r * 0.9, cx + r * 0.85, cy - r * 0.15, cx + r * 0.2, cy - r * 0.35);
  g.fillStyle(0x8fb8e8, 1).fillTriangle(cx - r * 0.15, cy + r * 0.15, cx + r * 0.15, cy + r * 0.15, cx, cy + r * 0.55);
  g.fillStyle(0x3a3a44, 1);
  g.fillCircle(cx - r * 0.28, cy, r * 0.09);
  g.fillCircle(cx + r * 0.28, cy, r * 0.09);
  g.fillCircle(cx, cy + r * 0.32, r * 0.08);
}

function drawPuddingToad(g: Phaser.GameObjects.Graphics, cx: number, cy: number, w: number, h: number): void {
  const r = Math.min(w, h) / 2.1;
  g.fillStyle(0xfff0c8, 1).fillEllipse(cx, cy + r * 0.1, r * 1.9, r * 1.5);
  g.fillEllipse(cx - r * 0.55, cy - r * 0.35, r * 0.55, r * 0.5);
  g.fillEllipse(cx + r * 0.55, cy - r * 0.35, r * 0.55, r * 0.5);
  g.fillStyle(0x3a3a44, 1);
  g.fillCircle(cx - r * 0.55, cy - r * 0.35, r * 0.12);
  g.fillCircle(cx + r * 0.55, cy - r * 0.35, r * 0.12);
  g.lineStyle(3, 0xb5655a, 1).beginPath().arc(cx, cy + r * 0.25, r * 0.4, 0.15, Math.PI - 0.15, false).strokePath();
}

function drawBanca(g: Phaser.GameObjects.Graphics, cx: number, cy: number, w: number, h: number): void {
  const r = Math.min(w, h) / 2.6;
  g.fillStyle(0xffcf5c, 1);
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i;
    g.fillTriangle(
      cx + Math.cos(angle) * r * 1.5, cy + Math.sin(angle) * r * 1.5,
      cx + Math.cos(angle + 0.18) * r * 0.95, cy + Math.sin(angle + 0.18) * r * 0.95,
      cx + Math.cos(angle - 0.18) * r * 0.95, cy + Math.sin(angle - 0.18) * r * 0.95,
    );
  }
  g.fillStyle(0xffdd7a, 1).fillCircle(cx, cy, r);
  g.fillStyle(0x3a3a44, 1);
  g.fillCircle(cx - r * 0.32, cy - r * 0.1, r * 0.1);
  g.fillCircle(cx + r * 0.32, cy - r * 0.1, r * 0.1);
  g.lineStyle(3, 0xb5655a, 1).beginPath().arc(cx, cy + r * 0.05, r * 0.45, 0.2, Math.PI - 0.2, false).strokePath();
  const hx = cx + r * 0.9, hy = cy + r * 0.75, hr = r * 0.16;
  g.fillStyle(0x55cabb, 1);
  g.fillCircle(hx - hr * 0.5, hy, hr * 0.6);
  g.fillCircle(hx + hr * 0.5, hy, hr * 0.6);
  g.fillTriangle(hx - hr, hy + hr * 0.2, hx + hr, hy + hr * 0.2, hx, hy + hr * 1.3);
}

function drawCritter(g: Phaser.GameObjects.Graphics, name: string, cx: number, cy: number, w: number, h: number): void {
  if (name === 'Frostfox') drawFrostfox(g, cx, cy, w, h);
  else if (name === 'Pudding Toad') drawPuddingToad(g, cx, cy, w, h);
  else drawBanca(g, cx, cy, w, h);
}

/** Card face: frame in colors[0], art box in colors[1], a procedural critter, and holo shimmer if marked. */
function buildCardFace(scene: Phaser.Scene, card: CollectibleCard, calm: boolean): Phaser.GameObjects.Container {
  const [frameColor, artColor] = card.colors;
  const w = CARD_W, h = CARD_H;
  const g = scene.add.graphics();
  g.fillStyle(frameColor, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 10);
  g.lineStyle(3, 0x1d1a22, 0.6).strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
  const artH = 104;
  const artY = -h / 2 + 14 + artH / 2;
  g.fillStyle(artColor, 1).fillRoundedRect(-w / 2 + 10, artY - artH / 2, w - 20, artH, 8);
  g.lineStyle(2, frameColor, 0.8).strokeRoundedRect(-w / 2 + 10, artY - artH / 2, w - 20, artH, 8);

  const critter = scene.add.graphics();
  drawCritter(critter, card.name, 0, artY, w - 34, artH - 20);

  const nameLabel = text(scene, 0, artY + artH / 2 + 16, card.name, 15, '#1d1a22').setFontStyle('bold');
  const kindLabel = text(scene, 0, artY + artH / 2 + 33, card.kind, 11, '#3a3a44');
  const abilityLabel = text(scene, 0, artY + artH / 2 + 52, card.ability, 10, '#1d1a22').setWordWrapWidth(w - 22).setAlign('center');

  const children: Phaser.GameObjects.GameObject[] = [g, critter, nameLabel, kindLabel, abilityLabel];

  if (card.holo === true) {
    const shimmer = scene.add.graphics();
    shimmer.fillGradientStyle(0xff6b6b, 0xffe66b, 0x6bffb0, 0x6bc7ff, 0.5);
    shimmer.fillRect(-15, -h * 0.53, 30, h * 1.06);
    shimmer.setBlendMode(ADD).setAngle(20);
    scene.tweens.add({ targets: shimmer, x: { from: -w * 0.65, to: w * 0.65 }, duration: calm ? 3000 : 1400, repeat: -1 });
    const holoLabel = text(scene, 0, -h / 2 + 13, 'RARE HOLO', 10, '#fff4d8').setFontStyle('bold');
    children.push(shimmer, holoLabel);
  }
  return scene.add.container(0, 0, children);
}

export const cardPackGame: Minigame = (context) => {
  const { scene, calm } = context;
  const layer = createLayer(scene);
  const scope = new GameScope(scene, layer);

  buildBackdrop(scene, layer, calm);

  const tian = scene.add.image(860, 536, figureKey('tian')).setOrigin(0.5, 1).setScale(3.4);
  layer.add(tian);
  const tagBg = scene.add.rectangle(800, 498, 92, 30, 0xf1ece0).setStrokeStyle(2, 0x8a6a4a);
  layer.add(tagBg);
  layer.add(text(scene, 800, 498, 'For Tian', 12, '#3a2a1e'));

  const flippedSet = new Set<number>();
  const givenSet = new Set<number>();
  let torn = false;
  let finished = false;

  const finish = (): void => {
    if (finished) return;
    finished = true;
    context.done();
  };

  const revealBinder = (): void => {
    context.hint('');
    const panelW = 660, panelH = 260, restY = HEIGHT - 150;
    const panel = scene.add.container(PACK_X, HEIGHT + panelH);
    layer.add(panel);
    const bg = scene.add.graphics();
    bg.fillStyle(0x2a2018, 1).fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 14);
    bg.lineStyle(3, 0xd8b34a, 0.8).strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 14);
    panel.add(bg);

    const cols = 3, rows = 2;
    const sleeveW = 180, sleeveH = 100, gapX = 20, gapY = 20;
    const gridW = cols * sleeveW + (cols - 1) * gapX;
    const gridH = rows * sleeveH + (rows - 1) * gapY;
    const startX = -gridW / 2 + sleeveW / 2;
    const startY = -gridH / 2 + sleeveH / 2;
    const sleeves = Array.from({ length: cols * rows }, (_, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = startX + col * (sleeveW + gapX);
      const y = startY + row * (sleeveH + gapY);
      const sleeveG = scene.add.graphics();
      sleeveG.lineStyle(2, 0xfdf6e3, 0.7).strokeRoundedRect(x - sleeveW / 2, y - sleeveH / 2, sleeveW, sleeveH, 8);
      const label = text(scene, x, y + sleeveH / 2 - 12, cardPack.occasions[i] ?? '', 11, '#fdf6e3');
      const sleeve = scene.add.container(0, 0, [sleeveG, label]);
      panel.add(sleeve);
      return sleeve;
    });

    scene.tweens.add({ targets: panel, y: restY, duration: calm ? 700 : 550, ease: 'Back.Out' });

    const fillColors = cardPack.cards.map(card => card.colors[1]);
    sleeves.forEach((sleeve, i) => {
      scope.after(650 + i * 150, () => {
        const col = i % cols, row = Math.floor(i / cols);
        const x = startX + col * (sleeveW + gapX);
        const y = startY + row * (sleeveH + gapY);
        const color = fillColors[i % fillColors.length] ?? 0xffffff;
        const thumb = scene.add.rectangle(x, y, sleeveW - 24, sleeveH - 20, color).setStrokeStyle(1, 0x1d1a22, 0.4).setScale(0);
        sleeve.add(thumb);
        scene.tweens.add({ targets: thumb, scale: 1, duration: 220, ease: 'Back.Out' });
        tone(scene, 500 + i * 30, 0.08);
        if (i === sleeves.length - 1) {
          burst(scene, PACK_X, restY, 0xffe66b, 22);
          scope.after(1200, () => finish());
        }
      });
    });
  };

  const giveCard = (index: number, container: Phaser.GameObjects.Container): void => {
    givenSet.add(index);
    container.disableInteractive();
    const lines = cardPack.giveLines;
    const line = lines[index % lines.length] ?? lines[0] ?? 'For Tian.';
    context.say(line);
    tone(scene, 700, 0.12);
    scene.tweens.add({ targets: container, x: 815, y: 460, scale: 0.55, duration: calm ? 500 : 420, ease: 'Cubic.Out' });
    floatText(scene, 815, 430, '♥', '#ff9ab8', 22);
    scope.after(700, () => revealBinder());
  };

  const onAllFlipped = (): void => context.hint(cardPack.hints.give);

  const flipCard = (index: number, container: Phaser.GameObjects.Container, card: CollectibleCard): void => {
    flippedSet.add(index);
    tone(scene, 480, 0.09);
    scene.tweens.add({
      targets: container,
      scaleX: 0,
      duration: 110,
      ease: 'Sine.In',
      onComplete: () => {
        container.removeAll(true);
        container.add(buildCardFace(scene, card, calm));
        scene.tweens.add({ targets: container, scaleX: 1, duration: 130, ease: 'Sine.Out' });
        tone(scene, 620, 0.1);
        if (card.holo === true) {
          burst(scene, container.x, container.y, 0xffe66b, 20);
          context.say('A rare holo! Suspiciously familiar.');
        }
        if (flippedSet.size === cardPack.cards.length) onAllFlipped();
      },
    });
  };

  const handleCardClick = (index: number, container: Phaser.GameObjects.Container, card: CollectibleCard): void => {
    if (!flippedSet.has(index)) { flipCard(index, container, card); return; }
    // One card is the present; the other two go straight into the collection.
    if (flippedSet.size === cardPack.cards.length && givenSet.size === 0) giveCard(index, container);
  };

  const dealCards = (): void => {
    context.hint(cardPack.hints.flip);
    cardPack.cards.forEach((card, index) => {
      const fanX = FAN_X[index] ?? PACK_X;
      const fanAngle = FAN_ANGLE[index] ?? 0;
      const cardContainer = scene.add.container(PACK_X, PACK_Y, [buildCardBack(scene, CARD_W, CARD_H)]);
      cardContainer.setSize(CARD_W, CARD_H).setName(`card-${index}`).setScale(0.7).setAlpha(0.9);
      layer.add(cardContainer);
      cardContainer.setInteractive({ useHandCursor: true });
      cardContainer.on('pointerdown', () => handleCardClick(index, cardContainer, card));
      scene.tweens.add({
        targets: cardContainer, x: fanX, y: FAN_Y, angle: fanAngle, scale: 1, alpha: 1,
        duration: calm ? 480 : 380, delay: index * 140, ease: 'Back.Out',
      });
    });
  };

  const wrapW = 210, wrapH = 250;
  const wrap = scene.add.graphics();
  wrap.fillStyle(0x1f6f63, 1).fillRoundedRect(PACK_X - wrapW / 2, PACK_Y - wrapH / 2, wrapW, wrapH, 14);
  wrap.lineStyle(4, 0xd8b34a, 1).strokeRoundedRect(PACK_X - wrapW / 2, PACK_Y - wrapH / 2, wrapW, wrapH, 14);
  wrap.lineStyle(1, 0xd8b34a, 0.5).strokeRoundedRect(PACK_X - wrapW / 2 + 9, PACK_Y - wrapH / 2 + 9, wrapW - 18, wrapH - 18, 10);
  layer.add(wrap);
  const emblem = scene.add.graphics().fillStyle(0xd8b34a, 0.9).fillPoints(starPoints(PACK_X, PACK_Y - 30, 5, 32, 14), true);
  const packLabel = text(scene, PACK_X, PACK_Y + 60, cardPack.packName, 13, '#fdf6e3').setWordWrapWidth(wrapW - 24).setAlign('center');
  layer.add([emblem, packLabel]);

  const body = scene.add.rectangle(PACK_X, PACK_Y + 35, wrapW - 20, wrapH - 90, 0x000000, 0.001).setInteractive({ useHandCursor: true });
  layer.add(body);
  body.on('pointerdown', () => { if (!torn) context.say(cardPack.hints.open); });

  const stripW = wrapW - 30, stripH = 30;
  const stripY = PACK_Y - wrapH / 2 + 24;
  const strip = scene.add.container(PACK_X, stripY);
  strip.setSize(stripW, stripH).setName('tear-strip');
  strip.add(scene.add.rectangle(0, 0, stripW, stripH, 0xd8b34a, 0.95).setStrokeStyle(2, 0x1f6f63));
  for (let i = -6; i <= 6; i++) strip.add(scene.add.rectangle(i * (stripW / 13), 0, 6, 2, 0x1f6f63, 0.7));
  strip.add(text(scene, 0, 0, 'TEAR HERE', 11, '#1f6f63'));
  strip.setInteractive({ useHandCursor: true });
  layer.add(strip);

  const tearOpen = (): void => {
    if (torn) return;
    torn = true;
    strip.disableInteractive();
    body.disableInteractive();
    [720, 560, 420, 300].forEach((freq, i) => scope.after(i * 45, () => tone(scene, freq, 0.07, 'sawtooth')));
    burst(scene, strip.x, strip.y, 0xd8b34a, 16);
    scene.tweens.add({
      targets: strip, x: strip.x + 260, y: strip.y - 160, angle: 220, alpha: 0,
      duration: calm ? 500 : 420, ease: 'Cubic.In', onComplete: () => strip.destroy(),
    });
    scene.tweens.add({ targets: [wrap, emblem, packLabel], alpha: 0, y: '-=40', duration: 420, delay: 160 });
    scope.after(260, () => dealCards());
  };

  let dragging = false;
  let minX = 0;
  let maxX = 0;
  strip.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    if (torn) return;
    dragging = true;
    minX = pointer.x;
    maxX = pointer.x;
  });
  const onMove = (pointer: Phaser.Input.Pointer): void => {
    if (!dragging || torn) return;
    minX = Math.min(minX, pointer.x);
    maxX = Math.max(maxX, pointer.x);
    if (maxX - minX >= stripW * 0.6) tearOpen();
  };
  const onUp = (): void => { dragging = false; };
  scene.input.on('pointermove', onMove);
  scene.input.on('pointerup', onUp);
  scope.onDispose(() => {
    scene.input.off('pointermove', onMove);
    scene.input.off('pointerup', onUp);
  });

  context.hint(cardPack.hints.open);

  return { destroy: () => scope.dispose() };
};
