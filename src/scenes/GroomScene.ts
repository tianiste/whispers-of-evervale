import Phaser from 'phaser';
import { tone } from '../systems/tones';

export interface GroomSession {
  horseFrame: number;
  horseName: string;
  /** Called after the fade-out; false when the player stopped early. */
  onFinish: (groomed: boolean) => void;
}

const HORSE = { x: 470, y: 290, scale: 5 };
// Muddy patches in horse-texture pixels: croup, belly, neck, shoulder, hind leg, foreleg.
const PATCHES = [[27, 37], [44, 47], [64, 28], [61, 41], [28, 57], [62, 59]] as const;
const PATCH_RADIUS = 44;
const SCRUB = 0.0025;
const FADE = { r: 16, g: 44, b: 43 };
const FONT = 'Arial, sans-serif';

/** A short brushing minigame: scrub the mud off with the mouse (or hold Space), about ten seconds. */
export class GroomScene extends Phaser.Scene {
  private session!: GroomSession;
  private patches: { x: number; y: number; dirt: number; blobs: Phaser.GameObjects.Container }[] = [];
  private brush!: Phaser.GameObjects.Container;
  private horse!: Phaser.GameObjects.Image;
  private bar!: Phaser.GameObjects.Rectangle;
  private last: { x: number; y: number } | null = null;
  private autoKey: Phaser.Input.Keyboard.Key | undefined;
  private autoAngle = 0;
  private nextDustAt = 0;
  private done = false;
  private leaving = false;

  constructor() {
    super('Groom');
  }

  init(session: GroomSession): void {
    this.session = session;
    this.patches = [];
    this.last = null;
    this.done = false;
    this.leaving = false;
  }

  create(): void {
    // Stable interior: planks, hay, a window of warm light.
    this.add.rectangle(480, 270, 960, 540, 0x6e4a32);
    for (let x = 0; x < 960; x += 48) this.add.rectangle(x, 230, 2, 460, 0x5a3a26);
    this.add.rectangle(480, 490, 960, 100, 0xc8a46e);
    for (let i = 0; i < 30; i++) this.add.rectangle((i * 67) % 960, 450 + (i * 13) % 80, 14, 2, 0xe8c880).setAngle((i * 29) % 40 - 20);
    this.add.rectangle(820, 130, 150, 110, 0xf4e0a8).setStrokeStyle(8, 0x4a3020);
    this.add.image(820, 130, 'environment-glow').setScale(2.6).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);
    for (const x of [90, 860]) this.add.rectangle(x, 430, 120, 70, 0xd8b04a).setStrokeStyle(2, 0xa0703a);
    this.add.ellipse(HORSE.x, 470, 380, 40, 0x000000, 0.22);
    this.horse = this.add.image(HORSE.x, HORSE.y, 'horses', this.session.horseFrame).setScale(HORSE.scale);

    for (const [px, py] of PATCHES) {
      const x = HORSE.x + (px - 48) * HORSE.scale, y = HORSE.y + (py - 40) * HORSE.scale;
      const blobs = this.add.container(x, y);
      for (let i = 0; i < 6; i++) {
        const angle = i * 1.05;
        blobs.add(this.add.circle(Math.cos(angle) * 14 * (i % 2 ? 1 : 0.5), Math.sin(angle) * 10, 9 + (i % 3) * 3, i % 2 ? 0x6e4a2a : 0x5a3a20, 0.92));
      }
      this.patches.push({ x, y, dirt: 1, blobs });
    }

    this.add.text(480, 34, `Groom ${this.session.horseName}`, { fontFamily: 'Georgia, serif', fontSize: '30px', color: '#fff0d1', stroke: '#2a1a10', strokeThickness: 6 }).setOrigin(0.5);
    this.add.rectangle(480, 76, 304, 18, 0x1d1a22, 0.7).setStrokeStyle(2, 0xf4efe6);
    this.bar = this.add.rectangle(330, 76, 0, 12, 0x55cabb).setOrigin(0, 0.5);
    this.add.text(480, 100, 'SHINE', { fontFamily: FONT, fontSize: '12px', color: '#f4e9cf', letterSpacing: 3 }).setOrigin(0.5);
    this.add.text(480, 522, 'Hold the mouse button and scrub the muddy spots · or hold Space · Esc to stop', {
      fontFamily: FONT, fontSize: '15px', color: '#fff0d1', backgroundColor: '#120f1ce6', padding: { x: 12, y: 6 },
    }).setOrigin(0.5, 1);

    // A wooden body brush that follows the pointer.
    this.brush = this.add.container(640, 300, [
      this.add.rectangle(0, 8, 58, 12, 0xe8dcc0),
      this.add.rectangle(0, -2, 64, 16, 0x8a5a3a).setStrokeStyle(2, 0x5a3a20),
      this.add.rectangle(0, -12, 30, 6, 0xa0703a),
    ]).setDepth(10).setAngle(-12);
    this.input.setDefaultCursor('none');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.setDefaultCursor('default'));
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.brush.setPosition(pointer.x, pointer.y);
      if (pointer.isDown) this.scrubTo(pointer.x, pointer.y);
      else this.last = null;
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => { this.last = { x: pointer.x, y: pointer.y }; });
    this.input.on('pointerup', () => { this.last = null; });
    this.autoKey = this.input.keyboard?.addKey('SPACE');
    this.input.keyboard?.addCapture('SPACE');
    this.input.keyboard?.on('keydown-ESC', () => this.leave(false));
    this.cameras.main.fadeIn(400, FADE.r, FADE.g, FADE.b);
  }

  update(_time: number, delta: number): void {
    if (this.done || !this.autoKey?.isDown) return;
    // Keyboard grooming: the brush circles the next muddy patch on its own.
    const patch = this.patches.find(candidate => candidate.dirt > 0);
    if (!patch) return;
    this.autoAngle += delta / 60;
    const x = patch.x + Math.cos(this.autoAngle) * 18, y = patch.y + Math.sin(this.autoAngle) * 12;
    if (!this.last) this.last = { x, y };
    this.brush.setPosition(x, y);
    this.scrubTo(x, y);
  }

  private scrubTo(x: number, y: number): void {
    if (this.done) return;
    const last = this.last ?? { x, y };
    const moved = Math.min(Phaser.Math.Distance.Between(last.x, last.y, x, y), 60);
    this.last = { x, y };
    if (!moved) return;
    this.brush.setAngle(-12 + Math.sin(this.time.now / 60) * 8);
    for (const patch of this.patches) {
      if (patch.dirt <= 0 || Phaser.Math.Distance.Between(x, y, patch.x, patch.y) > PATCH_RADIUS) continue;
      patch.dirt = Math.max(0, patch.dirt - moved * SCRUB);
      patch.blobs.setAlpha(patch.dirt).setScale(0.6 + patch.dirt * 0.4);
      if (this.time.now > this.nextDustAt) {
        this.nextDustAt = this.time.now + 60;
        const dust = this.add.circle(x + Phaser.Math.Between(-10, 10), y, 4, 0xc8a46e, 0.7).setDepth(9);
        this.tweens.add({ targets: dust, y: y - 30, x: dust.x + Phaser.Math.Between(-20, 20), alpha: 0, scale: 2, duration: 500, onComplete: () => dust.destroy() });
      }
      if (patch.dirt === 0) this.cleaned(patch);
    }
    const shine = 1 - this.patches.reduce((sum, patch) => sum + patch.dirt, 0) / this.patches.length;
    this.bar.width = 300 * shine;
  }

  private cleaned(patch: (typeof this.patches)[number]): void {
    patch.blobs.setVisible(false);
    const remaining = this.patches.filter(candidate => candidate.dirt > 0).length;
    tone(this, 620 + (this.patches.length - remaining) * 60, 0.12);
    this.sparkle(patch.x, patch.y, 10);
    // Ear flick and a contented wiggle.
    this.tweens.add({ targets: this.horse, scaleY: HORSE.scale * 1.02, y: HORSE.y - 4, duration: 110, yoyo: true });
    this.heart(patch.x, patch.y - 20);
    if (!remaining) this.complete();
  }

  private complete(): void {
    this.done = true;
    this.bar.width = 300;
    [523, 659, 784].forEach((frequency, i) => this.time.delayedCall(i * 120, () => tone(this, frequency, 0.25)));
    this.time.delayedCall(420, () => tone(this, 880, 0.35, 'triangle'));
    const gleam = this.add.image(HORSE.x, HORSE.y, 'horses', this.session.horseFrame).setScale(HORSE.scale).setTintFill(0xffffff).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: gleam, alpha: 0.45, duration: 260, yoyo: true, repeat: 1 });
    for (let i = 0; i < 4; i++) this.time.delayedCall(i * 160, () => this.sparkle(HORSE.x - 150 + i * 100, HORSE.y - 60 + (i % 2) * 70, 8));
    for (let i = 0; i < 5; i++) this.time.delayedCall(i * 140, () => this.heart(HORSE.x + 140 + (i % 2) * 20, HORSE.y - 110));
    const cheer = this.add.text(480, 160, `${this.session.horseName} is gleaming!`, {
      fontFamily: 'Georgia, serif', fontSize: '34px', color: '#fff0d1', stroke: '#2a1a10', strokeThickness: 6,
    }).setOrigin(0.5).setScale(0.6);
    this.tweens.add({ targets: cheer, scale: 1, duration: 260, ease: 'Back.Out' });
    this.time.delayedCall(1700, () => this.leave(true));
  }

  private sparkle(x: number, y: number, count: number): void {
    const emitter = this.add.particles(x, y, 'environment-glow', {
      speed: { min: 40, max: 130 }, scale: { start: 0.12, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: 600, tint: 0xfff6d8, blendMode: 'ADD', emitting: false,
    }).setDepth(11);
    emitter.explode(count);
    this.time.delayedCall(700, () => emitter.destroy());
  }

  private heart(x: number, y: number): void {
    const heart = this.add.text(x, y, '♥', { fontFamily: FONT, fontSize: '22px', color: '#ff8fa8', stroke: '#2a1a10', strokeThickness: 3 }).setOrigin(0.5).setDepth(12);
    this.tweens.add({ targets: heart, y: y - 40, alpha: 0, duration: 900, onComplete: () => heart.destroy() });
  }

  private leave(groomed: boolean): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(400, FADE.r, FADE.g, FADE.b);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.session.onFinish(groomed);
      this.scene.stop();
    });
  }
}
