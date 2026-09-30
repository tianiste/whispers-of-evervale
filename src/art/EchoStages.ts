import Phaser from 'phaser';
import { atmosphere, cue } from '../systems/audio';
import { futureHome, type FutureSpotId } from '../data/echoGames';
import type { EchoSetting } from '../data/echoes';
import { FIGURE_WIDTH, figureKey, type FigureId } from './EchoFigures';

/** Visual memory for one Echo. Cues come from step data; `instant` restores state after a reload. */
export interface EchoStage {
  cue(name: string, instant: boolean): void;
}

/** What a stage may show about the player's own game, e.g. their horse in a picture frame. */
export interface StageContext {
  horseFrame: number;
  horseName: string;
}

type StageBuilder = (scene: Phaser.Scene, calm: boolean, context: StageContext) => EchoStage;
type Image = Phaser.GameObjects.Image;

const ADD = Phaser.BlendModes.ADD;
const FONT = 'Arial, sans-serif';

export function createEchoStage(scene: Phaser.Scene, setting: EchoSetting, calm: boolean, context: StageContext): EchoStage {
  return builders[setting](scene, calm, context);
}

function person(scene: Phaser.Scene, id: FigureId, x: number, feetY: number, scale: number): Image {
  return scene.add.image(x, feetY, figureKey(id)).setOrigin(0.5, 1).setScale(scale);
}

/** Screen position of a texture pixel on a bottom-centered figure. */
function pixel(figure: Image, px: number, py: number): { x: number; y: number } {
  return { x: figure.x + (px - FIGURE_WIDTH / 2) * figure.scaleX, y: figure.y - (figure.height - py) * figure.scaleY };
}

function glow(scene: Phaser.Scene, x: number, y: number, tint: number, scale: number, alpha: number): Image {
  return scene.add.image(x, y, 'environment-glow').setTint(tint).setScale(scale).setAlpha(alpha).setBlendMode(ADD);
}

function bubble(scene: Phaser.Scene, x: number, y: number, text: string, linger = 2600): Phaser.GameObjects.Text {
  const label = scene.add.text(x, y, text, {
    fontFamily: FONT, fontSize: '15px', color: '#1d1a22', backgroundColor: '#f4efe6', padding: { x: 8, y: 5 },
  }).setOrigin(0.5, 1).setDepth(60).setScale(0.6);
  scene.tweens.add({ targets: label, scale: 1, duration: 180, ease: 'Back.Out' });
  scene.tweens.add({ targets: label, alpha: 0, delay: linger, duration: 400, onComplete: () => label.destroy() });
  return label;
}

function floatText(scene: Phaser.Scene, x: number, y: number, text: string, color: string): void {
  const label = scene.add.text(x, y, text, { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color }).setOrigin(0.5).setDepth(60);
  scene.tweens.add({ targets: label, y: y - 34, alpha: 0, duration: 1300, ease: 'Sine.Out', onComplete: () => label.destroy() });
}

// Echo I: a dark hard-techno hall, beams, silhouettes and a very bad first impression.
function club(scene: Phaser.Scene, calm: boolean): EchoStage {
  const camera = scene.cameras.main.setBackgroundColor('#07050d');
  [0x1c1032, 0x170d29, 0x120a21, 0x0e0819, 0x0a0612].forEach((color, i) => scene.add.rectangle(480, 32 + i * 64, 960, 64, color));
  scene.add.rectangle(480, 440, 960, 200, 0x0c0916);
  const grid = scene.add.graphics().lineStyle(1, 0x3ff6e0, 0.1);
  for (let i = -9; i <= 9; i++) grid.lineBetween(480 + i * 26, 340, 480 + i * 110, 540);
  for (const y of [352, 372, 398, 430, 470]) grid.lineBetween(0, y, 960, y);
  for (const x of [100, 860]) {
    scene.add.rectangle(x, 250, 120, 200, 0x141120).setStrokeStyle(2, 0x2c2642);
    for (const [dy, radius] of [[-55, 24], [30, 36]] as const) scene.add.circle(x, 250 + dy, radius, 0x09080e).setStrokeStyle(3, 0x2c2642);
  }
  glow(scene, 300, 120, 0x9a4dff, 5, 0.18);
  glow(scene, 660, 140, 0x3ff6e0, 5, 0.14);
  person(scene, 'crowd', 480, 252, 2.2).setTint(0x05030a);
  scene.add.rectangle(480, 262, 250, 50, 0x151022).setStrokeStyle(2, 0x3ff6e0, 0.45);
  const leds = Array.from({ length: 12 }, (_, i) => scene.add.rectangle(392 + i * 16, 252, 8, 4, i % 2 ? 0xb04dff : 0x3ff6e0));
  ([[230, 0x3ff6e0], [370, 0xb04dff], [590, 0x3ff6e0], [730, 0xb04dff]] as const).forEach(([x, color], i) => {
    const beam = scene.add.triangle(x, -10, 70, 0, 0, 470, 140, 470, color, 0.12).setOrigin(0.5, 0).setBlendMode(ADD);
    const swing = i % 2 ? 24 : -24;
    scene.tweens.add({ targets: beam, angle: { from: swing, to: -swing }, duration: (calm ? 5200 : 2600) + i * 260, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  });
  const crowd = Array.from({ length: 18 }, (_, i) => person(scene, 'crowd', 40 + (i * 157) % 880, 338 + (i % 2) * 18, 2.3 + (i % 2) * 0.3).setTint(0x0b0714));
  const floorPulse = scene.add.ellipse(480, 420, 900, 120, 0x9a4dff, 0).setBlendMode(ADD);

  const feet = 380;
  const cast = {
    tilen: person(scene, 'tilen', 250, feet, 4),
    maj: person(scene, 'maj', 318, feet, 4),
    hana: person(scene, 'hana', 398, feet, 4),
    tian: person(scene, 'tian', 580, feet, 4),
    friendA: person(scene, 'friend-a', 656, feet, 4),
    friendB: person(scene, 'friend-b', 726, feet, 4),
  };
  Object.values(cast).forEach(figure => figure.setTint(0x1c1230));
  const labels = ([[cast.tilen, 'Tilen'], [cast.maj, 'Maj'], [cast.hana, 'Hana'], [cast.tian, 'Tian'], [cast.friendA, 'his friends']] as const).map(([figure, name]) =>
    scene.add.text(figure === cast.friendA ? 691 : figure.x, figure.y - figure.displayHeight - 10, name, {
      fontFamily: FONT, fontSize: '14px', color: '#f4e9cf', backgroundColor: '#1c1230cc', padding: { x: 6, y: 3 },
    }).setOrigin(0.5, 1).setAlpha(0));

  let lit = false;
  let count = 0;
  scene.time.addEvent({
    delay: 420, loop: true, callback: () => {
      count++;
      crowd.forEach((figure, i) => { if ((i + count) % 3) scene.tweens.add({ targets: figure, y: figure.y - 5, duration: 110, yoyo: true }); });
      if (lit) [cast.maj, cast.tilen, cast.friendA, cast.friendB].forEach((figure, i) => { if ((i + count) % 2) scene.tweens.add({ targets: figure, y: figure.y - 3, duration: 110, yoyo: true }); });
      leds.forEach(led => led.setAlpha(Math.random() > 0.4 ? 1 : 0.25));
      floorPulse.setAlpha(0.22);
      scene.tweens.add({ targets: floorPulse, alpha: 0, duration: 380 });
      if (!calm) scene.tweens.add({ targets: camera, zoom: 1.012, duration: 70, yoyo: true });
      cue(scene, 'kick');
    },
  });

  const light = (instant: boolean): void => {
    if (lit) return;
    lit = true;
    Object.values(cast).forEach(figure => figure.clearTint());
    cast.friendA.setTint(0xc8c0dc);
    cast.friendB.setTint(0xc8c0dc);
    labels.forEach(label => instant ? label.setAlpha(1) : scene.tweens.add({ targets: label, alpha: 1, duration: 500 }));
    if (!instant) {
      const flash = glow(scene, 490, 320, 0x3ff6e0, 6, 0.55);
      scene.tweens.add({ targets: flash, alpha: 0, duration: 700, onComplete: () => flash.destroy() });
    }
  };
  const burn = (instant: boolean): void => {
    const cheek = pixel(cast.tian, 15.5, 6.5);
    const mark = (): void => { scene.add.rectangle(cheek.x, cheek.y, 4, 4, 0xff6b5a, 0.9); };
    if (instant) { mark(); return; }
    const hand = pixel(cast.hana, 19, 20.5);
    const control = { x: (hand.x + cheek.x) / 2, y: Math.min(hand.y, cheek.y) - 70 };
    const ember = scene.add.circle(hand.x, hand.y, 3, 0xffa04a);
    const emberGlow = glow(scene, hand.x, hand.y, 0xff7a2a, 0.35, 0.9);
    scene.tweens.addCounter({
      from: 0, to: 1, duration: 900, ease: 'Sine.InOut',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        const x = (1 - t) ** 2 * hand.x + 2 * (1 - t) * t * control.x + t * t * cheek.x;
        const y = (1 - t) ** 2 * hand.y + 2 * (1 - t) * t * control.y + t * t * cheek.y;
        ember.setPosition(x, y);
        emberGlow.setPosition(x, y);
      },
      onComplete: () => {
        ember.destroy();
        scene.tweens.add({ targets: emberGlow, scale: 1.4, alpha: 0, duration: 420, onComplete: () => emberGlow.destroy() });
        mark();
        cue(scene, 'bonk', 0.5);
        floatText(scene, cheek.x + 34, cheek.y - 8, 'tsss!', '#ffb36b');
        for (let i = 0; i < 3; i++) {
          const puff = scene.add.circle(cheek.x + 6, cheek.y - 4, 4, 0xb8b0c8, 0.5);
          scene.tweens.add({ targets: puff, x: puff.x + 10 + i * 6, y: puff.y - 30 - i * 10, scale: 2.4, alpha: 0, duration: 1100, delay: i * 120, onComplete: () => puff.destroy() });
        }
        scene.tweens.add({ targets: cast.tian, x: cast.tian.x + 4, duration: 50, yoyo: true, repeat: 3 });
        bubble(scene, cast.tian.x + 10, cast.tian.y - cast.tian.displayHeight - 36, '!!');
        bubble(scene, cast.hana.x, cast.hana.y - cast.hana.displayHeight - 36, 'sorry!! sorry!!');
      },
    });
  };
  return {
    cue(name, instant) {
      if (name === 'crowd') light(instant);
      if (name === 'cigarette') { light(true); burn(instant); }
    },
  };
}

// Echo II: GEN-I office and warehouse side by side, joined by break-time phone calls.
function split(scene: Phaser.Scene): EchoStage {
  scene.cameras.main.setBackgroundColor('#1d1a22');
  scene.add.rectangle(240, 175, 480, 350, 0xd6e4e6);
  scene.add.rectangle(240, 445, 480, 190, 0xa9b6b9);
  scene.add.rectangle(240, 350, 480, 6, 0x9aabb0);
  scene.add.rectangle(120, 160, 150, 100, 0x9fd3ea).setStrokeStyle(5, 0xf4f7f8);
  scene.add.ellipse(100, 150, 54, 16, 0xffffff, 0.9);
  scene.add.ellipse(150, 178, 40, 12, 0xffffff, 0.8);
  scene.add.text(350, 96, 'GEN-I', { fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: '#1f6f8b' }).setOrigin(0.5);
  scene.add.rectangle(350, 118, 90, 3, 0x55cabb);
  scene.add.rectangle(345, 318, 200, 10, 0x8a6a4a);
  scene.add.rectangle(255, 356, 8, 66, 0x6e533a);
  scene.add.rectangle(435, 356, 8, 66, 0x6e533a);
  scene.add.rectangle(372, 284, 70, 46, 0x22313a);
  const screen = scene.add.rectangle(372, 282, 60, 36, 0x6fd0ff, 0.85);
  scene.add.rectangle(372, 310, 10, 8, 0x22313a);
  scene.add.rectangle(300, 307, 10, 12, 0xf4efe6);
  scene.add.rectangle(42, 336, 26, 30, 0xb0764a);
  for (const [x, y, r] of [[42, 306, 16], [30, 316, 12], [54, 314, 12]] as const) scene.add.circle(x, y, r, 0x5a9a5a);
  const hana = person(scene, 'hana', 215, 380, 3.4);

  scene.add.rectangle(720, 175, 480, 350, 0x6b5a48);
  for (let x = 490; x < 960; x += 14) scene.add.rectangle(x, 175, 2, 350, 0x5d4e3f);
  scene.add.rectangle(720, 445, 480, 190, 0x4a4038);
  scene.add.rectangle(720, 356, 480, 5, 0xd8b34a);
  for (const sx of [790, 900]) {
    scene.add.rectangle(sx - 50, 250, 6, 200, 0xd08a3a);
    scene.add.rectangle(sx + 50, 250, 6, 200, 0xd08a3a);
    for (const y of [190, 262, 334]) {
      scene.add.rectangle(sx, y, 106, 6, 0xd08a3a);
      scene.add.rectangle(sx - 22, y - 14, 34, 22, 0xb8874f).setStrokeStyle(1, 0x8a6232);
      scene.add.rectangle(sx + 20, y - 12, 28, 18, 0xa5773f).setStrokeStyle(1, 0x8a6232);
    }
  }
  scene.add.rectangle(650, 30, 2, 60, 0x2a2622);
  scene.add.rectangle(650, 64, 40, 12, 0x2a2622);
  glow(scene, 650, 96, 0xffc070, 2.2, 0.35);
  const tian = person(scene, 'tian', 640, 380, 3.4);
  const carry = pixel(tian, 12, 21);
  const box = scene.add.rectangle(carry.x, carry.y, 46, 30, 0xb8874f).setStrokeStyle(2, 0x8a6232);

  scene.add.rectangle(480, 270, 8, 540, 0x1d1a22);
  scene.add.circle(480, 58, 30, 0xf4efe6).setStrokeStyle(4, 0x1d1a22).setDepth(10);
  const hands = scene.add.graphics().setDepth(11);
  const drawClock = (hour: number, minute: number): void => {
    hands.clear().lineStyle(3, 0x1d1a22);
    const hourAngle = ((hour % 12) + minute / 60) / 12 * Math.PI * 2 - Math.PI / 2;
    const minuteAngle = minute / 60 * Math.PI * 2 - Math.PI / 2;
    hands.lineBetween(480, 58, 480 + Math.cos(hourAngle) * 14, 58 + Math.sin(hourAngle) * 14);
    hands.lineBetween(480, 58, 480 + Math.cos(minuteAngle) * 22, 58 + Math.sin(minuteAngle) * 22);
  };
  drawClock(11, 55);
  const time = scene.add.text(480, 96, '11:55', {
    fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#f4efe6', backgroundColor: '#1d1a22', padding: { x: 6, y: 3 },
  }).setOrigin(0.5, 0).setDepth(11);
  const officeDim = scene.add.rectangle(239, 270, 478, 540, 0x0b0e14, 0.64);
  const warehouseDim = scene.add.rectangle(721, 270, 478, 540, 0x0b0e14, 0.64);
  const warm = scene.add.rectangle(480, 270, 960, 540, 0xffc861, 0).setBlendMode(ADD).setDepth(5);

  const reveal = (dim: Phaser.GameObjects.Rectangle, instant: boolean): void => {
    if (instant) dim.setAlpha(0);
    else scene.tweens.add({ targets: dim, alpha: 0, duration: 600 });
  };
  const phones = (instant: boolean): void => {
    drawClock(12, 0);
    time.setText('12:00 · BREAK');
    const floor = { x: box.x + 44, y: 368 };
    if (instant) box.setPosition(floor.x, floor.y);
    else scene.tweens.add({ targets: box, ...floor, duration: 400, ease: 'Quad.In' });
    const ends = [pixel(hana, 18, 6), pixel(tian, 6, 6)];
    for (const end of ends) {
      scene.add.rectangle(end.x, end.y, 10, 16, 0x1a1a24).setDepth(20);
      scene.add.rectangle(end.x, end.y - 1, 7, 11, 0x8ff0ff).setDepth(21);
    }
    const [from, to] = ends as [{ x: number; y: number }, { x: number; y: number }];
    const dots = Array.from({ length: 11 }, (_, i) => {
      const t = (i + 1) / 12;
      const x = (1 - t) ** 2 * from.x + 2 * (1 - t) * t * 480 + t * t * to.x;
      const y = (1 - t) ** 2 * from.y + 2 * (1 - t) * t * 130 + t * t * to.y;
      return scene.add.circle(x, y, 3, 0x8ff0ff).setDepth(20).setBlendMode(ADD);
    });
    scene.tweens.add({ targets: dots, alpha: { from: 0.15, to: 1 }, duration: 480, yoyo: true, repeat: -1, delay: scene.tweens.stagger(80, {}) });
    if (!instant) {
      bubble(scene, hana.x + 30, hana.y - hana.displayHeight - 16, 'Break in five?', 3200);
      scene.time.delayedCall(900, () => bubble(scene, tian.x - 20, tian.y - tian.displayHeight - 16, 'Already counting, Banca.', 3200));
    }
  };
  const thought = scene.add.container(480, 206).setDepth(30).setScale(0);
  const sea = (instant: boolean): void => {
    for (const [x, y, r] of [[-42, 2, 38], [0, -14, 48], [44, 2, 38], [0, 20, 40]] as const) thought.add(scene.add.circle(x, y, r, 0xffffff, 0.96));
    thought.add([
      scene.add.ellipse(0, -2, 124, 66, 0xbfe6f5),
      scene.add.rectangle(0, 16, 104, 24, 0x2f8fa8),
      scene.add.rectangle(0, 10, 104, 2, 0x8fd8e8),
      scene.add.circle(30, -14, 9, 0xffd86a),
      scene.add.triangle(-24, 0, 0, 12, 12, 0, 24, 12, 0xe86a6a),
      scene.add.rectangle(-24, 10, 2, 14, 0x6e533a),
    ]);
    for (const [x, y] of [[hana.x + 36, hana.y - hana.displayHeight - 20], [tian.x - 30, tian.y - tian.displayHeight - 20]] as const) {
      [0, 1, 2].forEach(i => {
        const t = (i + 1) / 4;
        scene.add.circle(x + (480 - x) * t, y + (206 - y) * t, 4 + i * 2, 0xffffff, 0.9).setDepth(30);
      });
    }
    if (instant) thought.setScale(1);
    else scene.tweens.add({ targets: thought, scale: 1, duration: 600, ease: 'Back.Out' });
  };
  const seaGlow = (instant: boolean): void => {
    if (instant) { warm.setAlpha(0.12); return; }
    scene.tweens.add({ targets: warm, alpha: 0.12, duration: 900 });
    scene.tweens.add({ targets: thought, scale: 1.14, duration: 420, yoyo: true, ease: 'Sine.InOut' });
    for (let i = 0; i < 6; i++) floatText(scene, 400 + i * 32, 150 + (i % 2) * 20, '✦', '#ffe7a0');
    floatText(scene, 450, 176, 'v', '#2a3a4a');
    floatText(scene, 510, 168, 'v', '#2a3a4a');
  };
  scene.tweens.add({ targets: screen, alpha: 0.6, duration: 900, yoyo: true, repeat: -1 });
  return {
    cue(name, instant) {
      if (name === 'office') reveal(officeDim, instant);
      if (name === 'warehouse') reveal(warehouseDim, instant);
      if (name === 'phones') { if (!instant) cue(scene, 'phone'); phones(instant); }
      if (name === 'sea') sea(instant);
      if (name === 'sea-glow') seaGlow(instant);
    },
  };
}

// Echo III: Banjole at night, one camper van, one bed, and then only half of one.
function camper(scene: Phaser.Scene): EchoStage {
  scene.cameras.main.setBackgroundColor('#0b1630');
  [0x0b1630, 0x0e1b3a, 0x122246].forEach((color, i) => scene.add.rectangle(480, 40 + i * 80, 960, 80, color));
  for (let i = 0; i < 46; i++) {
    const star = scene.add.rectangle((i * 211) % 960, 8 + (i * 67) % 190, 2, 2, 0xf4efd8, 0.8);
    scene.tweens.add({ targets: star, alpha: 0.2, duration: 900 + (i % 5) * 400, yoyo: true, repeat: -1, delay: i * 70 });
  }
  scene.add.circle(880, 60, 22, 0xf4efd8);
  glow(scene, 880, 60, 0xf4efd8, 1.6, 0.35);
  scene.add.rectangle(480, 330, 960, 90, 0x173d5c);
  for (let i = 0; i < 8; i++) {
    const wave = scene.add.rectangle(60 + i * 120, 300 + (i % 3) * 18, 36, 2, 0x5fa8c8, 0.7);
    scene.tweens.add({ targets: wave, x: wave.x + 14, alpha: 0.2, duration: 1800 + i * 150, yoyo: true, repeat: -1 });
  }
  scene.add.rectangle(480, 460, 960, 170, 0x4d4a55);
  for (const [x, y, w] of [[50, 250, 70], [118, 262, 54]] as const) scene.add.triangle(x, y, w / 2, 0, 0, 110, w, 110, 0x0a1226);
  scene.add.rectangle(895, 322, 110, 56, 0x1f2a48);
  scene.add.rectangle(910, 314, 26, 16, 0xffc48a);
  glow(scene, 910, 314, 0xffc48a, 0.8, 0.4);

  const van = scene.add.graphics();
  van.fillStyle(0xe8dcc0).fillRoundedRect(160, 100, 640, 280, 36);
  van.lineStyle(4, 0x2e2740).strokeRoundedRect(160, 100, 640, 280, 36);
  van.fillStyle(0x4fb3a3).fillRect(162, 330, 636, 14);
  van.fillStyle(0x3b3350).fillRoundedRect(190, 126, 580, 196, 18);
  van.fillStyle(0x1a2d55).fillRoundedRect(640, 142, 110, 60, 8);
  van.fillStyle(0x2f5f86).fillRect(646, 182, 98, 14);
  van.fillStyle(0xf4efd8).fillCircle(726, 160, 7);
  for (const x of [300, 660]) scene.add.circle(x, 384, 30, 0x1a1a22).setStrokeStyle(4, 0x3a3a44);
  glow(scene, 250, 150, 0xffc48a, 2.4, 0.35);
  const bulbs = Array.from({ length: 16 }, (_, i) => scene.add.circle(222 + i * 34, 136 + (i % 2) * 3, 3, [0xffd86a, 0x8ff0ff, 0xff9ab8][i % 3]!));
  scene.tweens.add({ targets: bulbs, alpha: 0.35, duration: 700, yoyo: true, repeat: -1, delay: scene.tweens.stagger(90, {}) });

  scene.add.rectangle(430, 196, 384, 16, 0x8a6a4a);
  scene.add.rectangle(430, 262, 380, 118, 0xf1ece0);
  const leftPillow = scene.add.rectangle(338, 220, 120, 26, 0xffffff).setStrokeStyle(1, 0xd8d0c0);
  scene.add.rectangle(522, 220, 120, 26, 0xffffff).setStrokeStyle(1, 0xd8d0c0);
  const head = (id: FigureId, x: number): Image => scene.add.image(x, 192, figureKey(id)).setOrigin(0.5, 0).setScale(4.2).setCrop(0, 0, FIGURE_WIDTH, 11);
  const hana = head('hana', 338);
  const tian = head('tian', 522);
  const water = scene.add.rectangle(240, 280, 190, 84, 0x3f8fd8).setOrigin(0, 0.5).setAlpha(0);
  const blanket = scene.add.rectangle(430, 280, 380, 88, 0x5aa9a0);
  const fold = scene.add.rectangle(430, 238, 380, 6, 0x7cc4b8);
  water.setDepth(2);
  const phones = [386, 474].map(x => scene.add.rectangle(x, 254, 14, 20, 0x1a1a24).setDepth(3));
  const screens = phones.map(phone => scene.add.rectangle(phone.x, phone.y - 1, 10, 15, 0x8ff0ff).setDepth(3));
  const faceGlow = [glow(scene, 338, 226, 0x8ff0ff, 0.5, 0.25), glow(scene, 522, 226, 0x8ff0ff, 0.5, 0.25)];
  scene.add.rectangle(222, 212, 40, 4, 0x8a6a4a);
  const glass = scene.add.container(222, 200, [scene.add.rectangle(0, 0, 10, 18, 0xbfe6ff, 0.8), scene.add.rectangle(0, 4, 8, 9, 0x6fc3ff)]);

  const game = (instant: boolean): void => {
    if (instant) return;
    const colors = [0xffd86a, 0xff6b9a, 0x6bd0ff, 0x9dff8a];
    scene.time.addEvent({ delay: 150, repeat: 11, callback: () => screens.forEach((screen, i) => screen.setFillStyle(colors[(i + Math.floor(Math.random() * 4)) % 4]!)) });
    scene.time.delayedCall(1900, () => screens.forEach(screen => screen.setFillStyle(0x8ff0ff)));
    for (let i = 0; i < 4; i++) scene.time.delayedCall(i * 260, () => floatText(scene, 386 + (i % 2) * 88, 236, '★', '#ffe27a'));
    bubble(scene, tian.x + 30, 188, 'One more match.');
  };
  const spill = (instant: boolean): void => {
    const settle = (): void => {
      leftPillow.setFillStyle(0xa8d4f0);
      [...phones, ...screens].forEach(item => item.setAlpha(0));
      faceGlow.forEach(light => light.setAlpha(0));
    };
    const squeeze = { hana: 470, tian: 566, blanketX: 525, width: 190 };
    if (instant) {
      glass.setPosition(236, 238).setAngle(100);
      water.setAlpha(0.5);
      hana.setX(squeeze.hana);
      tian.setX(squeeze.tian);
      blanket.setX(squeeze.blanketX).setDisplaySize(squeeze.width, 88);
      fold.setX(squeeze.blanketX).setDisplaySize(squeeze.width, 6);
      settle();
      return;
    }
    scene.tweens.add({ targets: glass, angle: 100, x: 236, y: 238, duration: 380, ease: 'Quad.In' });
    scene.time.delayedCall(380, () => {
      cue(scene, 'splash');
      floatText(scene, 300, 236, 'SPLASH!', '#8fd0ff');
      water.setScale(0.15, 1);
      scene.tweens.add({ targets: water, alpha: 0.5, scaleX: 1, duration: 700, ease: 'Sine.Out' });
      settle();
    });
    scene.time.delayedCall(1250, () => {
      scene.tweens.add({ targets: hana, x: squeeze.hana, duration: 900, ease: 'Sine.InOut' });
      scene.tweens.add({ targets: tian, x: squeeze.tian, duration: 900, ease: 'Sine.InOut' });
      scene.tweens.add({ targets: [blanket, fold], x: squeeze.blanketX, displayWidth: squeeze.width, duration: 900, ease: 'Sine.InOut' });
    });
    scene.time.delayedCall(2250, () => { cue(scene, 'bonk', 0.45); floatText(scene, 518, 180, 'squish', '#fff0d1'); });
  };
  return {
    cue(name, instant) {
      if (name === 'game') { if (!instant) cue(scene, 'ui-select'); game(instant); }
      if (name === 'wet-bed') spill(instant);
    },
  };
}

// Echo IV: a rented seaside flat, a kitchen built for one person, and dinner on the balcony side.
function flat(scene: Phaser.Scene): EchoStage {
  scene.cameras.main.setBackgroundColor('#2a2230');
  scene.add.rectangle(480, 200, 960, 400, 0xf1e4cc);
  scene.add.rectangle(480, 470, 960, 140, 0xb08a5e);
  for (let x = 0; x < 960; x += 64) scene.add.rectangle(x, 470, 2, 140, 0x9a764e);
  scene.add.rectangle(480, 150, 300, 160, 0xf2a07a);
  const dusk = scene.add.rectangle(480, 150, 300, 160, 0x2a3a6a).setAlpha(0);
  const sun = scene.add.circle(420, 170, 22, 0xffd8a0);
  scene.add.rectangle(480, 205, 300, 50, 0x3f7fa8);
  for (let i = 0; i < 5; i++) scene.add.rectangle(360 + i * 60, 195 + (i % 2) * 14, 26, 2, 0xbfe6f5, 0.8);
  const stars = Array.from({ length: 10 }, (_, i) => scene.add.rectangle(345 + (i * 67) % 270, 84 + (i * 29) % 70, 2, 2, 0xf4efd8).setAlpha(0));
  scene.add.rectangle(480, 150, 300, 160).setStrokeStyle(8, 0xf4efe6);
  scene.add.rectangle(480, 150, 4, 160, 0xf4efe6);
  for (let x = 340; x <= 620; x += 20) scene.add.rectangle(x, 218, 3, 24, 0x5a4a5a);
  scene.add.rectangle(480, 206, 300, 3, 0x5a4a5a);
  // Kitchenette on the left: counter, two-ring stove, one cupboard.
  scene.add.rectangle(150, 360, 230, 70, 0xe8dcc0).setStrokeStyle(2, 0x9a8a70);
  scene.add.rectangle(150, 322, 236, 8, 0x8a6a48);
  for (const x of [110, 170]) scene.add.circle(x, 316, 12, 0x3a3a44).setStrokeStyle(2, 0x22222a);
  scene.add.rectangle(150, 150, 200, 90, 0xd8c49a).setStrokeStyle(2, 0x9a8a70);
  const map = scene.add.container(760, 140).setScale(0);
  map.add([scene.add.rectangle(0, 0, 120, 80, 0xe9d7ac).setStrokeStyle(2, 0x9a7b52), scene.add.rectangle(40, 0, 30, 76, 0x7fb8d0)]);
  for (const [x, y] of [[-30, -20], [-10, 16], [20, -8], [34, 22]] as const) map.add(scene.add.circle(x, y, 4, 0xc0392b));
  map.add(scene.add.graphics().lineStyle(2, 0x5a4632, 0.7).strokePoints([{ x: -30, y: -20 }, { x: -10, y: 16 }, { x: 20, y: -8 }, { x: 34, y: 22 }]));
  // Table and chairs on the right, where dinner ends up.
  scene.add.rectangle(790, 372, 200, 12, 0x8a6a4a);
  for (const x of [705, 875]) scene.add.rectangle(x, 410, 8, 66, 0x6e533a);
  for (const x of [675, 905]) scene.add.rectangle(x, 400, 36, 8, 0x9a7650);
  const hana = person(scene, 'hana', 560, 440, 3.4);
  const tian = person(scene, 'tian', 630, 440, 3.4);
  const dim = scene.add.rectangle(480, 270, 960, 540, 0x0b0e14, 0.55).setDepth(40);
  const dinner = scene.add.container(790, 358).setAlpha(0);
  const tray = scene.add.graphics();
  tray.fillStyle(0xd9dee2).fillPoints([{ x: -44, y: -12 }, { x: 40, y: -14 }, { x: 46, y: 6 }, { x: -46, y: 8 }], true).lineStyle(2, 0x9aa3aa).strokePoints([{ x: -44, y: -12 }, { x: 40, y: -14 }, { x: 46, y: 6 }, { x: -46, y: 8 }], true);
  tray.fillStyle(0xc8503a).fillRect(-36, -10, 72, 6).fillStyle(0xfff1b8).fillRect(-36, -13, 72, 3);
  dinner.add(tray);
  for (const x of [66, 86]) dinner.add(scene.add.graphics().fillStyle(0xe8b44a).slice(x, 0, 10, Math.PI, 0, false).fillPath().fillStyle(0x6fbf5a).fillRect(x - 8, -1, 16, 2));
  // The special cookies wait on the kitchen counter, clear of the table.
  const cookies = scene.add.container(232, 312).setAlpha(0);
  cookies.add(scene.add.ellipse(0, 4, 40, 9, 0xf4efe6));
  for (const x of [-9, 0, 9]) cookies.add(scene.add.circle(x, 0, 5, 0x8a5a3a));
  cookies.add(scene.add.text(0, -22, 'special cookies', { fontFamily: FONT, fontSize: '11px', color: '#5a4632', backgroundColor: '#fff6e0', padding: { x: 3, y: 1 } }).setOrigin(0.5));
  const candle = glow(scene, 790, 330, 0xffc48a, 1.4, 0).setDepth(2);
  const phones = [hana, tian].map(figure => {
    const at = pixel(figure, figure === hana ? 18 : 6, 20);
    return scene.add.rectangle(at.x, at.y, 8, 12, 0x8ff0ff).setAlpha(0).setDepth(3);
  });

  const lights = (instant: boolean): void => {
    if (instant) { dim.setAlpha(0); return; }
    scene.tweens.add({ targets: dim, alpha: 0, duration: 900 });
    scene.tweens.add({ targets: sun, y: 176, duration: 1400 });
  };
  const pinMap = (instant: boolean): void => {
    if (instant) { map.setScale(1); return; }
    scene.tweens.add({ targets: map, scale: 1, duration: 420, ease: 'Back.Out' });
    bubble(scene, hana.x, hana.y - hana.displayHeight - 12, 'Walk tomorrow too?');
  };
  const buzz = (instant: boolean): void => {
    phones.forEach(phone => phone.setAlpha(1));
    if (instant) return;
    scene.tweens.add({ targets: phones, alpha: 0.4, duration: 220, yoyo: true, repeat: 5 });
    for (let i = 0; i < 3; i++) scene.time.delayedCall(i * 300, () => floatText(scene, 595 + (i - 1) * 30, 290, '✦', '#bff8ec'));
    scene.time.delayedCall(600, () => bubble(scene, tian.x + 20, tian.y - tian.displayHeight - 12, 'Got it!'));
  };
  const serve = (instant: boolean): void => {
    phones.forEach(phone => phone.setVisible(false));
    const seat = { hana: 690, tian: 890 };
    if (instant) {
      dusk.setAlpha(0.85); stars.forEach(star => star.setAlpha(0.9)); sun.setAlpha(0);
      dinner.setAlpha(1); cookies.setAlpha(1); candle.setAlpha(0.5); hana.setX(seat.hana); tian.setX(seat.tian);
      return;
    }
    scene.tweens.add({ targets: dusk, alpha: 0.85, duration: 1400 });
    scene.tweens.add({ targets: sun, alpha: 0, y: 200, duration: 1400 });
    scene.tweens.add({ targets: stars, alpha: 0.9, duration: 900, delay: scene.tweens.stagger(90, {}) });
    scene.tweens.add({ targets: hana, x: seat.hana, duration: 900, ease: 'Sine.InOut' });
    scene.tweens.add({ targets: tian, x: seat.tian, duration: 900, ease: 'Sine.InOut' });
    scene.tweens.add({ targets: [dinner, cookies], alpha: 1, duration: 600, delay: 700 });
    scene.tweens.add({ targets: candle, alpha: 0.5, duration: 600, delay: 700 });
    scene.time.delayedCall(1500, () => bubble(scene, seat.tian, tian.y - tian.displayHeight - 12, 'It held!'));
    scene.time.delayedCall(2300, () => bubble(scene, seat.hana, hana.y - hana.displayHeight - 12, 'Barely.'));
  };
  return {
    cue(name, instant) {
      if (name === 'room') lights(instant);
      if (name === 'map') pinMap(instant);
      if (name === 'phones') { if (!instant) cue(scene, 'phone'); buzz(instant); }
      if (name === 'dinner') { if (!instant) cue(scene, 'cook'); serve(instant); }
    },
  };
}

/** A knitted hat on a figure, placed from its texture pixels. */
function beanie(scene: Phaser.Scene, figure: Image, color: number): Phaser.GameObjects.Container {
  const top = pixel(figure, 12.5, 1);
  const s = figure.scaleX;
  return scene.add.container(top.x, top.y, [
    scene.add.rectangle(0, 0, 11 * s, 3 * s, color),
    scene.add.rectangle(0, 1.5 * s, 11 * s, 1 * s, 0xf4efe6),
    scene.add.circle(0, -2.5 * s, 1.6 * s, 0xf4efe6),
  ]);
}

function snowfall(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, calm: boolean, area = { x: 0, y: 0, width: 960, height: 540 }): void {
  for (let i = 0; i < 44; i++) {
    const x = area.x + (i * 157) % area.width;
    const duration = (calm ? 9000 : 5200) + (i % 5) * 700;
    const flake = scene.add.rectangle(x, area.y, 3, 3, 0xffffff, 0.85);
    parent.add(flake);
    const fall = scene.tweens.add({ targets: flake, y: { from: area.y, to: area.y + area.height }, x: { from: x, to: x + 18 }, duration, repeat: -1 });
    // Start mid-fall so the scene opens already snowing.
    fall.seek((i * 377) % duration);
  }
}

// Echo V: Christmas Eve cards, snow outside with Maj, then orehi in a warm kitchen.
function winter(scene: Phaser.Scene, calm: boolean): EchoStage {
  scene.cameras.main.setBackgroundColor('#101828');
  const eve = scene.add.container(0, 0);
  const snow = scene.add.container(0, 0).setAlpha(0);
  const kitchen = scene.add.container(0, 0).setAlpha(0);

  eve.add([scene.add.rectangle(480, 210, 960, 420, 0x5a3440), scene.add.rectangle(480, 480, 960, 120, 0x6e4a36)]);
  eve.add(scene.add.rectangle(760, 170, 200, 150, 0x0e1830).setStrokeStyle(8, 0xe8dcc0));
  snowfall(scene, eve, calm, { x: 662, y: 98, width: 196, height: 144 });
  const bulbs = Array.from({ length: 22 }, (_, i) => scene.add.circle(30 + i * 43, 28 + Math.sin(i) * 6, 4, [0xffd86a, 0x8ff0ff, 0xff9ab8, 0x9dff8a][i % 4]!));
  eve.add(bulbs);
  scene.tweens.add({ targets: bulbs, alpha: 0.35, duration: 800, yoyo: true, repeat: -1, delay: scene.tweens.stagger(70, {}) });
  for (const [y, w] of [[340, 140], [290, 110], [240, 80], [195, 50]] as const) eve.add(scene.add.triangle(150, y, w / 2, 0, 0, 60, w, 60, 0x2f6a4a).setOrigin(0.5, 0));
  eve.add(scene.add.rectangle(150, 408, 20, 18, 0x6e4a36));
  eve.add(scene.add.star(150, 186, 5, 6, 13, 0xffd86a));
  for (const [x, y, c] of [[120, 300, 0xff6b6b], [175, 280, 0x8ff0ff], [140, 350, 0xffd86a], [185, 345, 0xff9ab8], [150, 245, 0x9dff8a]] as const) eve.add(scene.add.circle(x, y, 5, c));
  eve.add(scene.add.rectangle(480, 380, 300, 70, 0x3f7a6e).setStrokeStyle(3, 0x2c5a50));
  eve.add(scene.add.rectangle(480, 440, 220, 12, 0x8a6a4a));
  const eveHana = person(scene, 'hana', 420, 420, 3.2);
  const eveTian = person(scene, 'tian', 540, 420, 3.2);
  eve.add([eveHana, eveTian]);
  for (const [x, c] of [[450, 0x55cabb], [510, 0xd8a04a]] as const) eve.add(scene.add.rectangle(x, 432, 22, 30, c).setStrokeStyle(2, 0xffd86a).setAngle(x === 450 ? -8 : 10));
  const binder = scene.add.container(480, 190).setScale(0);
  binder.add(scene.add.rectangle(0, 0, 200, 120, 0x2c3e5a).setStrokeStyle(3, 0xffd86a));
  for (let i = 0; i < 6; i++) binder.add(scene.add.rectangle(-60 + (i % 3) * 60, -26 + Math.floor(i / 3) * 52, 40, 44, [0x8fb8e8, 0xd8a04a, 0x55cabb][i % 3]!).setStrokeStyle(1, 0xffffff));
  eve.add(binder);

  snow.add([scene.add.rectangle(480, 200, 960, 400, 0x1a2a50), scene.add.rectangle(480, 90, 960, 180, 0x101c3a)]);
  snow.add(scene.add.rectangle(480, 470, 960, 150, 0xe8f0f8));
  for (const [x, w] of [[140, 260], [520, 320], [860, 240]] as const) snow.add(scene.add.ellipse(x, 400, w, 70, 0xf4f8fc));
  snow.add(scene.add.rectangle(760, 300, 8, 190, 0x2a2a34));
  snow.add(glow(scene, 760, 210, 0xffd8a0, 1.6, 0.6));
  snow.add(scene.add.rectangle(760, 208, 26, 14, 0xffe7a0));
  const maj = person(scene, 'maj', 330, 430, 3.4);
  const snowHana = person(scene, 'hana', 460, 430, 3.4);
  const snowTian = person(scene, 'tian', 560, 430, 3.4);
  const hats = [beanie(scene, maj, 0xc0392b), beanie(scene, snowHana, 0x55cabb), beanie(scene, snowTian, 0x3a3f5a)];
  snow.add([maj, snowHana, snowTian, ...hats]);
  snowfall(scene, snow, calm);

  kitchen.add([scene.add.rectangle(480, 200, 960, 400, 0xe8d8c0), scene.add.rectangle(480, 450, 960, 180, 0xa87e56)]);
  for (let x = 20; x < 960; x += 40) kitchen.add(scene.add.rectangle(x, 250, 36, 36, 0xf1e8d8).setStrokeStyle(1, 0xd8c8b0));
  kitchen.add(scene.add.rectangle(200, 150, 180, 130, 0x0e1830).setStrokeStyle(8, 0xf4efe6));
  snowfall(scene, kitchen, calm, { x: 112, y: 88, width: 176, height: 124 });
  kitchen.add(scene.add.rectangle(800, 330, 170, 180, 0x3a3a44));
  const ovenGlow = scene.add.rectangle(800, 345, 120, 70, 0xff9a4a, 0.7);
  kitchen.add([ovenGlow, glow(scene, 800, 345, 0xffa04a, 1.3, 0.4)]);
  kitchen.add(scene.add.rectangle(480, 366, 960, 10, 0x8a6a48));
  const kitchenHana = person(scene, 'hana', 420, 366, 3.2);
  const kitchenTian = person(scene, 'tian', 530, 366, 3.2);
  kitchen.add([kitchenHana, kitchenTian]);
  const plate = scene.add.container(640, 356).setAlpha(0);
  plate.add(scene.add.ellipse(0, 4, 110, 22, 0xf4efe6).setStrokeStyle(2, 0xd8d0c0));
  for (const [x, y] of [[-30, -4], [0, -8], [30, -4], [-15, -14], [15, -14]] as const) {
    plate.add(scene.add.ellipse(x, y, 22, 16, 0xc8904a).setStrokeStyle(1, 0x8a5a2a));
    plate.add(scene.add.rectangle(x, y, 1, 12, 0x8a5a2a));
  }
  kitchen.add(plate);

  let current = eve;
  const show = (next: Phaser.GameObjects.Container, instant: boolean): void => {
    if (next === current) return;
    const previous = current;
    current = next;
    if (instant) { previous.setAlpha(0); next.setAlpha(1); return; }
    scene.tweens.add({ targets: previous, alpha: 0, duration: 700 });
    scene.tweens.add({ targets: next, alpha: 1, duration: 700 });
  };
  const openBinder = (instant: boolean): void => {
    if (instant) { binder.setScale(1); return; }
    scene.tweens.add({ targets: binder, scale: 1, duration: 500, ease: 'Back.Out' });
    for (let i = 0; i < 5; i++) scene.time.delayedCall(i * 140, () => floatText(scene, 420 + i * 30, 250, '✦', '#ffe7a0'));
  };
  const flop = (instant: boolean): void => {
    const figures = [maj, snowHana, snowTian];
    figures.forEach((figure, i) => {
      const angel = scene.add.graphics().fillStyle(0xd8e4f0).fillEllipse(figure.x, figure.y - 12, figure.displayHeight, 30)
        .fillEllipse(figure.x - 10, figure.y - 30, figure.displayHeight * 0.7, 18).fillEllipse(figure.x - 10, figure.y + 6, figure.displayHeight * 0.7, 18);
      snow.addAt(angel, snow.getIndex(maj));
      const pose = { angle: i === 1 ? 90 : -90, y: figure.y - 12 };
      const hat = hats[i]!;
      if (instant) { figure.setAngle(pose.angle).setY(pose.y); hat.setVisible(false); return; }
      angel.setAlpha(0);
      scene.tweens.add({ targets: figure, ...pose, duration: 380, delay: i * 220, ease: 'Quad.In' });
      scene.tweens.add({ targets: hat, alpha: 0, duration: 200, delay: i * 220 });
      scene.tweens.add({ targets: angel, alpha: 1, duration: 400, delay: 380 + i * 220 });
      scene.time.delayedCall(380 + i * 220, () => floatText(scene, figure.x, figure.y - 40, 'flop!', '#ffffff'));
    });
  };
  const serve = (instant: boolean): void => {
    if (instant) { plate.setAlpha(1); ovenGlow.setAlpha(0.3); return; }
    scene.tweens.add({ targets: plate, alpha: 1, y: plate.y - 4, duration: 500 });
    scene.tweens.add({ targets: ovenGlow, alpha: 0.3, duration: 800 });
    for (let i = 0; i < 3; i++) {
      const steam = scene.add.circle(620 + i * 20, 330, 5, 0xffffff, 0.5);
      kitchen.add(steam);
      scene.tweens.add({ targets: steam, y: 280, alpha: 0, scale: 2, duration: 1400, delay: i * 300, repeat: 2 });
    }
    scene.time.delayedCall(900, () => bubble(scene, kitchenTian.x + 20, kitchenTian.y - kitchenTian.displayHeight - 12, 'One more? Just one.'));
  };
  return {
    cue(name, instant) {
      if (name === 'eve') { atmosphere(scene, 'cards'); show(eve, instant); }
      if (name === 'binder') openBinder(instant);
      if (name === 'snow') { atmosphere(scene, 'snow'); show(snow, instant); }
      if (name === 'snow-angels') { if (!instant) cue(scene, 'snow'); flop(instant); }
      if (name === 'kitchen') { atmosphere(scene, 'kitchen'); show(kitchen, instant); }
      if (name === 'orehi-plate') serve(instant);
    },
  };
}

/** A seated figure: only head and torso show above the couch seat. */
function seated(scene: Phaser.Scene, id: FigureId, x: number, seatY: number, rows: number, scale: number): Image {
  return scene.add.image(x, seatY - rows * scale, figureKey(id)).setOrigin(0.5, 0).setScale(scale).setCrop(0, 0, FIGURE_WIDTH, rows);
}

function cat(scene: Phaser.Scene, id: string, x: number, feetY: number, scale: number, facingLeft = false): Image {
  return scene.add.image(x, feetY, `cat-${id}`).setOrigin(0.5, 1).setScale(scale).setFlipX(facingLeft);
}

// Echo VI: an ordinary evening in an apartment that doesn't exist yet. Click areas come from futureHome in echoGames.ts.
function future(scene: Phaser.Scene, calm: boolean, context: StageContext): EchoStage {
  scene.cameras.main.setBackgroundColor('#1a1612');
  const at = (id: FutureSpotId): { x: number; y: number } => futureHome.spots.find(spot => spot.id === id)!;
  const lines = futureHome;

  // Room shell: cream walls, a teal accent wall behind the couch, oak floor and a rug.
  scene.add.rectangle(480, 180, 960, 360, 0xe6d6ba);
  scene.add.rectangle(475, 208, 350, 296, 0x4f8f88);
  for (let x = 314; x < 650; x += 28) scene.add.rectangle(x, 208, 1, 296, 0x46827b);
  scene.add.rectangle(480, 357, 960, 10, 0x8a6a48);
  scene.add.rectangle(480, 451, 960, 178, 0xb88a58);
  for (let row = 0; row < 8; row++) {
    const y = 362 + row * 22;
    scene.add.rectangle(480, y + 22, 960, 2, 0x9c7446);
    for (let k = 0; k < 4; k++) scene.add.rectangle((row * 137 + k * 260) % 960, y + 11, 2, 20, 0x9c7446);
  }
  scene.add.ellipse(480, 428, 460, 84, 0x4f9a92);
  scene.add.ellipse(480, 428, 430, 66, 0xf1e6cc);
  scene.add.ellipse(480, 428, 380, 44).setStrokeStyle(2, 0x7cc4b8);

  // String lights along the ceiling.
  const bulbs: Phaser.GameObjects.Arc[] = [];
  for (let i = 0; i < 24; i++) {
    const x = 20 + i * 40;
    const y = 28 + Math.sin((i % 6) / 6 * Math.PI) * 12;
    bulbs.push(scene.add.circle(x, y, 3, i % 3 ? 0xffd98a : 0xbff8ec));
    glow(scene, x, y + 2, 0xffd08a, 0.3, 0.35);
  }
  scene.add.graphics().lineStyle(1, 0x5a4632, 0.8).strokePoints(bulbs.map(bulb => ({ x: bulb.x, y: bulb.y - 3 })));
  if (!calm) scene.tweens.add({ targets: bulbs, alpha: 0.55, duration: 1200, yoyo: true, repeat: -1, delay: scene.tweens.stagger(110, {}) });

  // Kitchen: window onto evening rooftops, fridge, counter, a pot on the stove and the burger bag.
  ([0x3a3a6a, 0x5a4a78, 0x9a6a7a, 0xd8906a] as const).forEach((color, i) => scene.add.rectangle(160, 121 + i * 25, 128, 25, color));
  scene.add.circle(198, 128, 8, 0xf4efd8);
  for (const [x, w, h] of [[108, 26, 34], [134, 30, 48], [166, 22, 28], [192, 34, 40]] as const) {
    scene.add.rectangle(x, 212 - h / 2, w, h, 0x1e2238);
    scene.add.rectangle(x - 4, 212 - h + 10, 4, 4, 0xffd98a);
  }
  scene.add.rectangle(160, 160, 128, 104).setStrokeStyle(6, 0xf4efe6);
  scene.add.rectangle(160, 160, 4, 104, 0xf4efe6);
  for (const x of [92, 228]) {
    scene.add.rectangle(x, 166, 16, 124, 0x55cabb);
    scene.add.rectangle(x - 3, 166, 2, 124, 0x3f9a8c);
  }
  scene.add.rectangle(45, 252, 62, 208, 0xe8e4da).setStrokeStyle(2, 0xb8b2a4);
  scene.add.rectangle(45, 206, 62, 2, 0xb8b2a4);
  scene.add.rectangle(70, 186, 3, 26, 0x9a948a);
  scene.add.rectangle(70, 240, 3, 34, 0x9a948a);
  for (const [x, y, c] of [[30, 180, 0x55cabb], [48, 232, 0xf2a8c0], [34, 262, 0xffd86a]] as const) scene.add.rectangle(x, y, 8, 8, c);
  scene.add.rectangle(50, 256, 16, 20, 0xf4efe6).setStrokeStyle(1, 0x9a948a);
  scene.add.rectangle(50, 258, 10, 8, 0x8a4f2d);
  scene.add.rectangle(173, 319, 178, 74, 0x5e8f86).setStrokeStyle(2, 0x46706a);
  for (const x of [128, 173, 218]) scene.add.rectangle(x, 319, 2, 70, 0x46706a);
  for (const x of [120, 136, 165, 181, 210, 226]) scene.add.circle(x, 312, 2, 0xc8a46e);
  scene.add.rectangle(173, 277, 184, 10, 0x8a6a48);
  scene.add.ellipse(118, 272, 30, 6, 0x2a2a30);
  scene.add.container(118, 262, [scene.add.rectangle(0, 0, 26, 16, 0x5a6470), scene.add.rectangle(0, -9, 30, 3, 0x7a8490), scene.add.rectangle(-17, -4, 6, 3, 0x2a2a30)]);
  for (const [x, h, c] of [[94, 14, 0xc0392b], [102, 10, 0x6fbf5a]] as const) scene.add.rectangle(x, 272 - h / 2, 6, h, c);
  const bag = scene.add.container(238, 272);
  bag.add([
    scene.add.rectangle(0, -15, 24, 30, 0xc89a5a).setStrokeStyle(1, 0x9a7440),
    scene.add.rectangle(0, -24, 24, 6, 0xd0453a),
    scene.add.ellipse(0, -12, 12, 5, 0xe8b44a), scene.add.rectangle(0, -10, 12, 2, 0x8a4f2d), scene.add.ellipse(0, -8, 12, 4, 0xe8b44a),
  ]);
  const fries = scene.add.container(258, 272);
  for (let i = 0; i < 5; i++) fries.add(scene.add.rectangle(-5 + i * 2.5, -18 - (i % 2) * 3, 2, 10, 0xf2d060));
  fries.add(scene.add.polygon(0, -8, [-7, -8, 7, -8, 5, 8, -5, 8], 0xd0453a).setOrigin(0.5));
  const tian = person(scene, 'tian', 178, 356, 3.1);
  const panAt = pixel(tian, 21, 20);
  const pan = scene.add.container(panAt.x + 14, panAt.y, [scene.add.ellipse(0, 0, 26, 8, 0x2a2a30), scene.add.rectangle(-18, 0, 14, 3, 0x6e533a), scene.add.ellipse(0, -2, 18, 4, 0xe8b44a)]);
  const steam = [0, 1, 2].map(i => scene.add.circle(112 + i * 7, 248, 4, 0xffffff, 0.45));
  steam.forEach((puff, i) => {
    if (calm) return;
    scene.tweens.add({ targets: puff, y: 200, alpha: 0, scale: 2, duration: 1800, delay: i * 600, repeat: -1 });
  });

  // Living room: the chosen horse above the couch, a lamp, the couch, and everyone on it.
  scene.add.rectangle(480, 146, 158, 112, 0x7a5236).setStrokeStyle(2, 0x5a3a24);
  scene.add.rectangle(480, 131, 138, 60, 0xbfe6f0);
  scene.add.ellipse(452, 170, 120, 40, 0x8fbf88);
  scene.add.ellipse(520, 172, 110, 34, 0x7aac74);
  scene.add.rectangle(480, 172, 138, 20, 0x8fbf88);
  scene.add.image(480, 150, 'horses', context.horseFrame).setScale(0.95);
  scene.add.rectangle(480, 146, 138, 92).setStrokeStyle(3, 0xe9d7ac);
  const plaque = scene.add.rectangle(480, 212, 84, 16, 0xe9d7ac).setStrokeStyle(1, 0x9a7b52);
  scene.add.text(480, 212, context.horseName.toUpperCase(), { fontFamily: FONT, fontSize: '10px', fontStyle: 'bold', color: '#5a4632', letterSpacing: 1 }).setOrigin(0.5);
  scene.add.rectangle(672, 268, 4, 176, 0x3a3230);
  scene.add.ellipse(672, 356, 32, 8, 0x3a3230);
  scene.add.polygon(672, 176, [-18, 14, 18, 14, 12, -14, -12, -14], 0xf2d9a4).setStrokeStyle(1, 0xc8a46e);
  const lamp = glow(scene, 672, 206, 0xffd8a0, 2.4, 0.4);
  scene.add.rectangle(480, 266, 324, 64, 0xcdb994).setStrokeStyle(2, 0xa8936c);
  scene.add.rectangle(480, 236, 324, 8, 0xd8c7a6);
  scene.add.rectangle(350, 274, 38, 32, 0x55cabb).setAngle(-10).setStrokeStyle(1, 0x3f9a8c);
  const hana = seated(scene, 'hana', 398, 300, 21, 3.1);
  const tianSeated = seated(scene, 'tian', 548, 300, 26, 3.1).setAlpha(0);
  const miki = cat(scene, 'miki', 466, 308, 3);
  scene.add.rectangle(480, 312, 316, 26, 0xd8c7a6).setStrokeStyle(1, 0xa8936c);
  for (const x of [428, 532]) scene.add.rectangle(x, 312, 2, 22, 0xb8a47e);
  scene.add.rectangle(480, 333, 344, 18, 0xb8a47e);
  for (const x of [322, 638]) {
    scene.add.rectangle(x, 300, 30, 78, 0xc4ae86).setStrokeStyle(2, 0xa8936c);
    scene.add.rectangle(x, 346, 6, 10, 0x6e533a);
  }
  const blanket = scene.add.container(322, 290);
  for (let i = 0; i < 6; i++) blanket.add(scene.add.rectangle(0, -18 + i * 9, 32, 9, i % 2 ? 0xf4efe6 : 0x55cabb));
  scene.add.container(398, 292, [scene.add.rectangle(0, 0, 18, 8, 0x2a2a34), scene.add.circle(5, -1, 1.5, 0x5ff0e0), scene.add.circle(-5, -1, 1.5, 0xff9ab8)]);
  const tianController = scene.add.container(548, 292, [scene.add.rectangle(0, 0, 18, 8, 0x2a2a34), scene.add.circle(5, -1, 1.5, 0xffd86a)]).setAlpha(0);
  const nomi = cat(scene, 'nomi', 640, 264, 2.4, true);

  // Coffee table: mugs, the phone with the creature game, and later the cake.
  scene.add.rectangle(400, 392, 6, 22, 0x6e533a);
  scene.add.rectangle(560, 392, 6, 22, 0x6e533a);
  scene.add.rectangle(480, 382, 172, 8, 0x7a5a3c);
  scene.add.rectangle(480, 374, 180, 10, 0x8a6a48);
  scene.add.rectangle(426, 364, 10, 12, 0x55cabb);
  scene.add.rectangle(446, 364, 10, 12, 0xf4efe6).setStrokeStyle(1, 0xc8b89a);
  const phone = scene.add.container(540, 366, [scene.add.rectangle(0, 0, 24, 13, 0x1d1a22), scene.add.rectangle(0, 0, 20, 9, 0x8fd8c8), scene.add.circle(0, 0, 3, 0xf4f1ea), scene.add.rectangle(3, 0, 2, 1, 0xf2a33a)]).setAngle(-8);

  // Floor friends: Bolt with his toy and water bowl, Viski, and Maks peeking out from under the table.
  const bowl = scene.add.container(250, 462, [scene.add.ellipse(0, 0, 34, 12, 0x9aa8b0), scene.add.ellipse(0, -2, 26, 7, 0x7fc8e8)]);
  const boltAt = at('bolt');
  const boltScale = 2.4;
  const k = boltScale / 1.6;
  const tail = scene.add.image(-22 * k, 0, 'bolt-tail').setOrigin(0, 0.5).setScale(boltScale).setAngle(-155);
  const ball = scene.add.image(27 * k, -3 * k, 'bolt-ball').setScale(boltScale);
  const bolt = scene.add.container(boltAt.x, boltAt.y + 4, [tail, scene.add.image(0, 0, 'bolt').setScale(boltScale), ball]);
  let wag = scene.tweens.add({ targets: tail, angle: -135, duration: calm ? 320 : 180, yoyo: true, repeat: -1 });
  const viski = cat(scene, 'viski', at('viski').x, 448, 2.4);
  const maks = cat(scene, 'maks', at('maks').x, 460, 2.3, true);
  for (const [x, y, c] of [[620, 500, 0xff9ab8], [140, 486, 0xffd86a]] as const) scene.add.circle(x, y, 5, c);
  scene.add.rectangle(40, 372, 22, 8, 0x3b3f5c);
  scene.add.rectangle(62, 376, 22, 8, 0xdcdcd6);

  // TV corner: anime on screen, a console, a block plush, the bookshelf and the plant Maks hides behind.
  scene.add.rectangle(780, 332, 164, 58, 0x9a7650).setStrokeStyle(2, 0x7a5a3c);
  scene.add.rectangle(780, 332, 2, 50, 0x7a5a3c);
  for (const x of [740, 820]) scene.add.circle(x, 332, 2, 0xe9d7ac);
  scene.add.rectangle(780, 302, 170, 6, 0x8a6a48);
  scene.add.rectangle(730, 294, 32, 10, 0x2a2a34);
  scene.add.rectangle(740, 294, 4, 2, 0x5ff0e0);
  const block = scene.add.container(at('blocks').x, 288, [
    scene.add.rectangle(0, 0, 22, 22, 0x8a5a3a), scene.add.rectangle(0, -8, 22, 6, 0x6fbf5a),
    scene.add.rectangle(-5, 3, 3, 3, 0x6e4428), scene.add.rectangle(5, 6, 3, 3, 0x6e4428), scene.add.rectangle(-8, -5, 3, 3, 0x8fd06a),
  ]);
  scene.add.rectangle(780, 250, 146, 94, 0x1d1a22);
  const anime = scene.add.container(780, 250);
  anime.add([scene.add.rectangle(0, -20, 134, 42, 0xf2b8d8), scene.add.rectangle(0, 20, 134, 40, 0xc8a8f0)]);
  for (let i = 0; i < 6; i++) anime.add(scene.add.rectangle(-60 + i * 24, -8 + (i % 3) * 10, 18, 1, 0xffffff, 0.8));
  anime.add([
    scene.add.polygon(-10, -18, [-22, 10, -16, -14, -6, 2, 0, -20, 8, 0, 18, -14, 22, 10], 0xf2a33a).setOrigin(0.5),
    scene.add.circle(-10, -2, 16, 0xf0c8a8),
    scene.add.ellipse(-16, -2, 7, 11, 0x2a2a44), scene.add.ellipse(-4, -2, 7, 11, 0x2a2a44),
    scene.add.rectangle(-17, -5, 2, 3, 0xffffff), scene.add.rectangle(-5, -5, 2, 3, 0xffffff),
    scene.add.star(34, -18, 4, 2, 6, 0xffffff), scene.add.star(46, 2, 4, 2, 5, 0xfff1b8),
    scene.add.rectangle(0, 32, 134, 14, 0x000000, 0.55),
  ]);
  const subtitle = scene.add.text(0, 32, '…!!', { fontFamily: FONT, fontSize: '10px', color: '#ffffff' }).setOrigin(0.5);
  anime.add(subtitle);
  const gameScreen = scene.add.container(780, 250).setAlpha(0);
  gameScreen.add([scene.add.rectangle(0, -10, 134, 60, 0x8fd0ff), scene.add.rectangle(0, 26, 134, 28, 0x6fbf5a)]);
  for (let i = 0; i < 9; i++) gameScreen.add(scene.add.rectangle(-60 + i * 15, 18 - (i % 3) * 8, 14, 14, i % 2 ? 0x8a5a3a : 0x6fbf5a));
  gameScreen.add(scene.add.text(40, -28, 'GG', { fontFamily: FONT, fontSize: '12px', fontStyle: 'bold', color: '#ffffff', stroke: '#1d1a22', strokeThickness: 2 }).setOrigin(0.5));
  const screenGlow = glow(scene, 780, 250, 0xc8b8ff, 2.2, 0.16);
  if (!calm) scene.tweens.add({ targets: screenGlow, alpha: 0.26, duration: 700, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [3] });
  scene.add.rectangle(913, 226, 74, 262, 0x6e5236).setStrokeStyle(3, 0x8a6a48);
  for (const y of [150, 205, 260, 310]) scene.add.rectangle(913, y, 70, 5, 0x8a6a48);
  for (let i = 0; i < 7; i++) scene.add.rectangle(884 + i * 9, 132 - (i % 3) * 3, 7, 30 + (i % 3) * 5, [0x55cabb, 0xd0654d, 0xe9d7ac, 0x5a6a8a][i % 4]!);
  const figure = scene.add.container(at('figure').x, 203, [
    scene.add.rectangle(0, -12, 10, 22, 0x2f3a44), scene.add.rectangle(0, -26, 10, 8, 0x3a4652),
    scene.add.rectangle(-7, -18, 5, 5, 0x55cabb), scene.add.rectangle(7, -18, 5, 5, 0x55cabb),
  ]);
  const visor = scene.add.rectangle(at('figure').x, 177, 7, 2, 0x5ff0e0);
  const trophy = scene.add.container(at('trophy').x, 203, [
    scene.add.rectangle(0, -2, 14, 4, 0x9a7b42), scene.add.rectangle(0, -8, 4, 8, 0xe8c14a), scene.add.rectangle(0, -20, 16, 14, 0xe8c14a),
    scene.add.text(0, -20, '#1', { fontFamily: FONT, fontSize: '8px', fontStyle: 'bold', color: '#6e4a1e' }).setOrigin(0.5),
  ]);
  scene.add.circle(900, 248, 9, 0xf4f1ea);
  scene.add.rectangle(907, 248, 5, 3, 0xf2a33a);
  for (const [x, w, c] of [[924, 12, 0xd0654d], [938, 10, 0x4f8f88]] as const) scene.add.rectangle(x, 244, w, 28, c);
  for (const [x, c] of [[892, 0xe9d7ac], [914, 0x55cabb], [934, 0xd8a04a]] as const) scene.add.rectangle(x, 298, 18, 18, c).setStrokeStyle(1, 0x5a4632);
  scene.add.rectangle(900, 336, 28, 34, 0xc8a46e).setStrokeStyle(1, 0x8a6a48);
  scene.add.rectangle(930, 336, 24, 34, 0xa8c8b8).setStrokeStyle(1, 0x8a6a48);
  const maco = cat(scene, 'maco', at('maco').x, 96, 2.4).setOrigin(0.5, 0).setFlipY(true).setY(96 - 24 * 2.4);
  scene.add.rectangle(878, 456, 30, 24, 0xc0663a).setStrokeStyle(1, 0x8a4a2a);
  for (const [dx, dy, r] of [[-14, -20, 14], [10, -26, 16], [0, -40, 14], [-6, -30, 12]] as const) scene.add.circle(878 + dx, 452 + dy, r, 0x4f8a4a);

  // Warm evening light over everything, and the haze of a memory that isn't written yet.
  scene.add.rectangle(480, 270, 960, 540, 0xffb070, 0.07).setBlendMode(ADD);
  const unwritten = scene.add.rectangle(480, 270, 960, 540, 0x0a0c18, 0.84).setDepth(40);
  const haze = [0, 1, 2, 3].map(i => glow(scene, 200 + i * 190, 200 + (i % 2) * 120, 0x8ffff0, 3, 0.18).setDepth(41));
  haze.forEach((puff, i) => { if (!calm) scene.tweens.add({ targets: puff, x: puff.x + 40, alpha: 0.08, duration: 3000 + i * 400, yoyo: true, repeat: -1, ease: 'Sine.InOut' }); });

  const head = (figure: Image, offset = 12): { x: number; y: number } => ({ x: figure.x, y: figure.originY === 0 ? figure.y - offset : figure.y - figure.displayHeight - offset });
  const say = (target: Image, text: string, delay = 0, dx = 0): void => {
    scene.time.delayedCall(delay, () => { const top = head(target); bubble(scene, top.x + dx, top.y, text, 2200); });
  };
  const hop = (target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject, height = 10): void => {
    scene.tweens.add({ targets: target, y: `-=${height}`, duration: 140, yoyo: true, ease: 'Sine.Out' });
  };
  const hearts = (x: number, y: number, count = 3): void => {
    for (let i = 0; i < count; i++) scene.time.delayedCall(i * 180, () => floatText(scene, x - 12 + i * 12, y, '♥', '#ff6f91'));
  };
  const cats = [nomi, miki, maks, maco, viski];
  let tianOnCouch = false;
  let celebrated = false;

  const lightUp = (instant: boolean): void => {
    const targets = [unwritten, ...haze];
    if (instant) { targets.forEach(item => item.setAlpha(0).setVisible(false)); return; }
    scene.tweens.add({ targets, alpha: 0, duration: 1600, onComplete: () => targets.forEach(item => item.setVisible(false)) });
    scene.tweens.add({ targets: lamp, alpha: 0.55, duration: 800, yoyo: true });
  };
  const sitDown = (instant: boolean): void => {
    if (tianOnCouch) return;
    tianOnCouch = true;
    anime.setAlpha(instant ? 0 : 1);
    if (instant) { tian.setAlpha(0); pan.setAlpha(0); tianSeated.setAlpha(1); tianController.setAlpha(1); gameScreen.setAlpha(1); return; }
    scene.tweens.add({ targets: [tian, pan], alpha: 0, duration: 500 });
    scene.tweens.add({ targets: [tianSeated, tianController], alpha: 1, duration: 500, delay: 400 });
    scene.tweens.add({ targets: anime, alpha: 0, duration: 400, delay: 900 });
    scene.tweens.add({ targets: gameScreen, alpha: 1, duration: 400, delay: 900 });
    scene.time.delayedCall(1300, () => {
      for (let i = 0; i < 3; i++) scene.time.delayedCall(i * 200, () => floatText(scene, 760 + i * 20, 220, '✦', '#bff8ec'));
      say(tianSeated, 'One more match?', 300);
      say(hana, 'Obviously.', 1500);
    });
  };
  const unfinished = (instant: boolean): void => {
    // Soft light gathers at the edges, as if the rest of the memory is still being written. It stays above the finale's dimming.
    const edges = Array.from({ length: 14 }, (_, i) => {
      const side = i % 4;
      const t = Math.floor(i / 4) / 3 + 0.12;
      const x = side === 2 ? 0 : side === 3 ? 960 : t * 960;
      const y = side === 0 ? 0 : side === 1 ? 540 : t * 540;
      return glow(scene, x, y, 0xbff8ec, 3.2, 0).setDepth(92);
    });
    if (instant) { edges.forEach(edge => edge.setAlpha(0.3)); return; }
    scene.tweens.add({ targets: edges, alpha: 0.3, duration: 2400, ease: 'Sine.InOut' });
    for (let i = 0; i < (calm ? 8 : 24); i++) {
      const edge = i % 4;
      const x = edge === 2 ? 20 : edge === 3 ? 940 : (i * 97) % 960;
      const y = edge === 0 ? 30 : edge === 1 ? 510 : (i * 61) % 540;
      const mote = scene.add.rectangle(x, y, 3, 3, 0xffffff, 0.9).setDepth(93).setBlendMode(ADD);
      scene.tweens.add({ targets: mote, x: x + (480 - x) * 0.12, y: y - 30, alpha: 0, duration: 2600, delay: i * 90, onComplete: () => mote.destroy() });
    }
  };
  const birthday = (instant: boolean): void => {
    if (celebrated) return;
    celebrated = true;
    sitDown(true);
    const bunting = scene.add.container(480, instant ? 70 : 40).setAlpha(instant ? 1 : 0);
    for (let i = 0; i < 13; i++) {
      const x = -168 + i * 28;
      const y = Math.sin(i / 12 * Math.PI) * 10;
      bunting.add(scene.add.triangle(x, y, 0, 0, 16, 0, 8, 14, [0x55cabb, 0xf4efe6, 0xe8c14a][i % 3]!).setOrigin(0.5, 0));
    }
    bunting.add(scene.add.graphics().lineStyle(1, 0x5a4632).strokePoints(Array.from({ length: 13 }, (_, i) => ({ x: -160 + i * 28, y: Math.sin(i / 12 * Math.PI) * 10 }))));
    const cake = scene.add.container(482, 368).setAlpha(instant ? 1 : 0);
    cake.add([scene.add.ellipse(0, 1, 50, 8, 0xf4efe6), scene.add.rectangle(0, -8, 38, 16, 0xf4e0c8), scene.add.rectangle(0, -15, 38, 4, 0x55cabb), scene.add.rectangle(0, -4, 38, 2, 0xf2a8c0)]);
    const flames = [-10, 0, 10].map(x => {
      cake.add(scene.add.rectangle(x, -21, 2, 8, [0xffd86a, 0x8ff0ff, 0xff9ab8][(x + 10) / 10]!));
      const flame = scene.add.ellipse(x, -27, 3, 5, 0xffb04a);
      cake.add([glow(scene, x, -27, 0xffc070, 0.25, 0.6), flame]);
      return flame;
    });
    if (!calm) scene.tweens.add({ targets: flames, scaleY: 1.4, duration: 180, yoyo: true, repeat: -1, delay: scene.tweens.stagger(60, {}) });
    nomi.setFlipX(true);
    maco.setFlipY(false).setY(96).setOrigin(0.5, 1);
    wag.remove();
    wag = scene.tweens.add({ targets: tail, angle: -125, duration: calm ? 240 : 90, yoyo: true, repeat: -1 });
    if (instant) return;
    scene.tweens.add({ targets: bunting, y: 70, alpha: 1, duration: 700, ease: 'Back.Out' });
    scene.tweens.add({ targets: cake, alpha: 1, duration: 600, delay: 300 });
    scene.tweens.add({ targets: lamp, alpha: 0.6, duration: 900 });
    hearts(miki.x, miki.y - miki.displayHeight - 4);
    say(miki, lines.catLines.miki, 500);
    const colors = [0x55cabb, 0xffd86a, 0xff9ab8, 0xbff8ec, 0xf4efe6];
    for (let i = 0; i < (calm ? 20 : 70); i++) {
      const x = (i * 131) % 960;
      const piece = scene.add.rectangle(x, -10, 4, 7, colors[i % colors.length]!).setDepth(35).setAngle(i * 23);
      scene.tweens.add({ targets: piece, y: 560, x: x + (i % 2 ? 30 : -30), angle: piece.angle + 360, duration: (calm ? 5200 : 3200) + (i % 7) * 300, delay: (i % 12) * 140, onComplete: () => piece.destroy() });
    }
  };

  const reactions: Record<string, (instant: boolean) => void> = {
    room: lightUp,
    evening: sitDown,
    unfinished,
    birthday,
    cats: (instant) => {
      if (instant) return;
      cats.forEach((target, i) => scene.time.delayedCall(i * 160, () => floatText(scene, target.x, target.y - (target.flipY ? 0 : target.displayHeight) - 6, '♥', '#ff6f91')));
      say(miki, lines.catLines.miki, 300);
    },
    nomi: () => { say(nomi, lines.catLines.nomi); nomi.setFlipX(!nomi.flipX); scene.tweens.add({ targets: nomi, x: nomi.x + (nomi.flipX ? -4 : 4), duration: 160, yoyo: true }); },
    miki: () => { say(miki, lines.catLines.miki); hearts(miki.x, miki.y - miki.displayHeight - 4); scene.tweens.add({ targets: miki, scaleY: 2.7, duration: 120, yoyo: true, repeat: 1 }); },
    'maks-flee': () => {
      const target = futureHome.spots.find(spot => spot.id === 'maks')!.flee!;
      floatText(scene, maks.x, maks.y - 60, '!', '#fff0d1');
      for (let i = 0; i < 4; i++) {
        const dust = scene.add.circle(maks.x - i * 8, maks.y - 4, 5, 0xd8c7a6, 0.6);
        scene.tweens.add({ targets: dust, alpha: 0, scale: 2, duration: 500, delay: i * 60, onComplete: () => dust.destroy() });
      }
      maks.setFlipX(false);
      scene.tweens.add({ targets: maks, x: target.x - 8, y: target.y + 20, duration: 360, ease: 'Quad.Out' });
    },
    maks: () => { say(maks, lines.catLines.maks); hop(maks, 6); },
    maco: () => { floatText(scene, maco.x, maco.y + 10, lines.catLines.maco, '#fff0d1'); scene.tweens.add({ targets: maco, angle: { from: -10, to: 10 }, duration: 160, yoyo: true, repeat: 2, onComplete: () => maco.setAngle(0) }); },
    viski: () => {
      const home = { x: viski.x, y: viski.y };
      scene.tweens.add({
        targets: viski, x: 720, y: 386, duration: 420, ease: 'Quad.In',
        onComplete: () => {
          cue(scene, 'bonk', 0.45);
          floatText(scene, 724, 330, lines.catLines.viski, '#fff0d1');
          floatText(scene, 740, 346, '✦', '#ffe27a');
          scene.tweens.add({ targets: viski, x: home.x, y: home.y, duration: 500, ease: 'Sine.Out', onComplete: () => scene.tweens.add({ targets: viski, angle: 360, duration: 700, onComplete: () => viski.setAngle(0) }) });
        },
      });
    },
    bolt: () => {
      cue(scene, 'toy', 0.55);
      cue(scene, 'splash', 0.35);
      hop(bolt, 14);
      hearts(bolt.x + 20, bolt.y - 50);
      ball.setPosition(33 * k, 20 * k);
      scene.time.delayedCall(1400, () => ball.setPosition(27 * k, -3 * k));
      for (let i = 0; i < 5; i++) {
        const drop = scene.add.circle(bowl.x, bowl.y - 4, 2, 0x9fd8f0);
        scene.tweens.add({ targets: drop, x: bowl.x - 14 + i * 7, y: bowl.y - 18 - (i % 2) * 6, alpha: 0, duration: 420, onComplete: () => drop.destroy() });
      }
    },
    hana: () => { say(tianOnCouch ? tianSeated : tian, lines.joke[0]); say(tianOnCouch ? tianSeated : tian, lines.joke[1], 1500); say(hana, lines.joke[2], 3000); scene.time.delayedCall(3000, () => scene.tweens.add({ targets: hana, x: hana.x + 2, duration: 50, yoyo: true, repeat: 3 })); },
    tian: () => {
      const cook = tianOnCouch ? tianSeated : tian;
      say(cook, lines.dinner[0]); say(hana, lines.dinner[1], 1500); say(cook, lines.dinner[2], 3000);
      steam.forEach(puff => scene.tweens.add({ targets: puff, scale: 2.2, duration: 200, yoyo: true }));
    },
    picture: () => {
      const shine = scene.add.rectangle(410, 146, 14, 96, 0xffffff, 0.5).setBlendMode(ADD).setAngle(14);
      scene.tweens.add({ targets: shine, x: 550, alpha: 0, duration: 700, onComplete: () => shine.destroy() });
      scene.tweens.add({ targets: plaque, scale: 1.12, duration: 160, yoyo: true });
    },
    tv: () => { subtitle.setText('!!!'); scene.tweens.add({ targets: screenGlow, alpha: 0.5, duration: 140, yoyo: true, repeat: 2 }); for (let i = 0; i < 3; i++) scene.time.delayedCall(i * 150, () => floatText(scene, 750 + i * 30, 200, '✦', '#f2b8d8')); },
    phone: () => { scene.tweens.add({ targets: phone, angle: 4, duration: 60, yoyo: true, repeat: 5, onComplete: () => phone.setAngle(-8) }); floatText(scene, phone.x, phone.y - 18, '✦', '#bff8ec'); },
    takeout: () => { scene.tweens.add({ targets: bag, angle: 6, duration: 80, yoyo: true, repeat: 3, onComplete: () => bag.setAngle(0) }); hop(fries, 6); },
    figure: () => { scene.tweens.add({ targets: visor, scaleX: 2, alpha: 0.4, duration: 200, yoyo: true, repeat: 2 }); hop(figure, 4); },
    trophy: () => { hop(trophy, 6); floatText(scene, trophy.x, trophy.y - 40, '★', '#ffe27a'); },
    blocks: () => { hop(block, 10); floatText(scene, block.x, block.y - 24, '+1', '#8fd06a'); },
  };
  let nomiVisits = 0;
  const sounds: Record<string, string> = {
    nomi: 'cat-nomi', miki: 'cat-miki', viski: 'cat-viski', maco: 'cat-maco', maks: 'cat-maks',
    'maks-flee': 'cat-maks', bolt: 'dog-pant', hana: 'ui-select', tian: 'cook', phone: 'phone',
    tv: 'shimmer', takeout: 'rustle', blocks: 'thud', figure: 'ui-select', trophy: 'confirm',
    picture: 'shimmer', birthday: 'reveal', cats: 'cat-miki', evening: 'ui-select',
  };
  return {
    cue(name, instant) {
      if (!instant) {
        const sound = name === 'nomi' && ++nomiVisits > 1 ? 'cat-grumpy' : sounds[name];
        if (sound) cue(scene, sound, 0.7);
      }
      reactions[name]?.(instant);
    },
  };
}

const builders: Record<EchoSetting, StageBuilder> = { club, split, camper, flat, winter, future };
