import Phaser from 'phaser';
import type { EchoSetting } from '../data/echoes';
import { FIGURE_WIDTH, figureKey, type FigureId } from './EchoFigures';

/** Visual memory for one Echo. Cues come from step data; `instant` restores state after a reload. */
export interface EchoStage {
  cue(name: string, instant: boolean): void;
}

type StageBuilder = (scene: Phaser.Scene, calm: boolean) => EchoStage;
type Image = Phaser.GameObjects.Image;

const ADD = Phaser.BlendModes.ADD;
const FONT = 'Arial, sans-serif';

export function createEchoStage(scene: Phaser.Scene, setting: EchoSetting, calm: boolean): EchoStage {
  return builders[setting](scene, calm);
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

function kick(scene: Phaser.Scene): void {
  const sound = scene.sound;
  if (!(sound instanceof Phaser.Sound.WebAudioSoundManager) || sound.mute || sound.context.state !== 'running') return;
  const { context } = sound;
  const now = context.currentTime;
  const tone = context.createOscillator();
  const gain = context.createGain();
  tone.frequency.setValueAtTime(110, now);
  tone.frequency.exponentialRampToValueAtTime(42, now + 0.12);
  gain.gain.setValueAtTime(0.06 * sound.volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  tone.connect(gain);
  gain.connect(context.destination);
  tone.start(now);
  tone.stop(now + 0.2);
  tone.onended = () => { tone.disconnect(); gain.disconnect(); };
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
      kick(scene);
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
      if (name === 'phones') phones(instant);
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
    scene.time.delayedCall(2250, () => floatText(scene, 518, 180, 'squish', '#fff0d1'));
  };
  return {
    cue(name, instant) {
      if (name === 'game') game(instant);
      if (name === 'wet-bed') spill(instant);
    },
  };
}

const builders: Record<EchoSetting, StageBuilder> = { club, split, camper };
