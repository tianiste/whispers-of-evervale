import Phaser from 'phaser';
import type { TrailPoint } from '../data/story';

const ADD = Phaser.BlendModes.ADD;
const PRINT_KEY = 'echo-hoofprint';
const STRIDE = 34;
const PRINT_EVERY_MS = 95;
const PRINT_LIFE_MS = 1700;
const MAX_REACH = 460;

/** A small horseshoe; tinted per trail. */
function ensurePrintTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(PRINT_KEY)) return;
  const texture = scene.textures.createCanvas(PRINT_KEY, 9, 10)!;
  const ctx = texture.getContext();
  ctx.fillStyle = '#ffffff';
  for (const [x, y, w, h] of [[1, 2, 2, 7], [6, 2, 2, 7], [2, 0, 5, 2], [1, 8, 2, 2], [6, 8, 2, 2]] as const) ctx.fillRect(x, y, w, h);
  texture.refresh();
}

/**
 * Glowing hoofprints that walk from the rider toward the next waymark and fade behind,
 * with fog and rising sparks at the waymark itself. Reused by every Echo trail.
 */
export class EchoTrail {
  private readonly root: Phaser.GameObjects.Container;
  private readonly beacon: Phaser.GameObjects.Container;
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly later: Phaser.GameObjects.Container;
  private target: TrailPoint | null = null;
  private tint = 0x8ffff0;
  private step = 0;
  private nextPrintAt = 0;
  private from = { x: 0, y: 0 };

  constructor(private readonly scene: Phaser.Scene) {
    ensurePrintTexture(scene);
    this.root = scene.add.container(0, 0).setDepth(2);
    this.later = scene.add.container(0, 0).setDepth(2);
    const fog = [0, 1, 2].map(i => scene.add.image(Math.cos(i * 2.1) * 40, Math.sin(i * 2.1) * 18, 'environment-glow').setScale(2.2).setAlpha(0.16).setBlendMode(ADD));
    fog.forEach((cloud, i) => scene.tweens.add({ targets: cloud, x: cloud.x + 26, y: cloud.y - 10, alpha: 0.26, duration: 2600 + i * 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
    const core = scene.add.image(0, 0, 'environment-glow').setScale(0.9).setBlendMode(ADD);
    scene.tweens.add({ targets: core, scale: 1.3, alpha: 0.5, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.beacon = scene.add.container(0, 0, [...fog, core]).setDepth(99997).setVisible(false);
    this.sparks = scene.add.particles(0, 0, 'environment-glow', {
      x: { min: -26, max: 26 }, y: { min: -6, max: 10 }, speedY: { min: -60, max: -25 }, speedX: { min: -8, max: 8 },
      scale: { start: 0.08, end: 0 }, alpha: { start: 0.9, end: 0 }, lifespan: 1400, frequency: 90, blendMode: 'ADD',
    }).setDepth(99998);
    this.sparks.stop();
  }

  /** Remaining waymarks of the current trail, or null to clear it. */
  show(points: readonly TrailPoint[] | null, tint = 0x8ffff0): void {
    this.later.removeAll(true);
    this.target = points?.[0] ?? null;
    this.tint = tint;
    this.step = 0;
    this.beacon.setVisible(Boolean(this.target));
    if (!this.target) { this.sparks.stop(); return; }
    this.beacon.setPosition(this.target.x, this.target.y);
    this.beacon.each((child: Phaser.GameObjects.GameObject) => (child as Phaser.GameObjects.Image).setTint(tint));
    this.sparks.setPosition(this.target.x, this.target.y).setParticleTint(tint).start();
    // Later waymarks stay faintly visible so the whole route reads at a glance.
    for (const point of (points ?? []).slice(1)) {
      const faint = this.scene.add.image(point.x, point.y, 'environment-glow').setTint(tint).setScale(0.35).setAlpha(0.35).setBlendMode(ADD);
      this.later.add(faint);
      this.scene.tweens.add({ targets: faint, alpha: 0.15, duration: 1400, yoyo: true, repeat: -1 });
    }
  }

  update(time: number, rider: { x: number; y: number }): void {
    if (!this.target || time < this.nextPrintAt) return;
    this.nextPrintAt = time + PRINT_EVERY_MS;
    if (this.step === 0) this.from = { x: rider.x, y: rider.y };
    const dx = this.target.x - this.from.x, dy = this.target.y - this.from.y;
    const length = Math.min(Math.hypot(dx, dy), MAX_REACH);
    const distance = this.step * STRIDE + STRIDE;
    if (distance > length - 20) { this.step = 0; this.nextPrintAt = time + 600; return; }
    const angle = Math.atan2(dy, dx);
    const side = this.step % 2 ? 7 : -7;
    const x = this.from.x + Math.cos(angle) * distance - Math.sin(angle) * side;
    const y = this.from.y + Math.sin(angle) * distance + Math.cos(angle) * side;
    const print = this.scene.add.image(x, y, PRINT_KEY).setTint(this.tint).setBlendMode(ADD).setRotation(angle + Math.PI / 2).setScale(1.3).setAlpha(0);
    this.root.add(print);
    this.scene.tweens.chain({
      targets: print,
      tweens: [{ alpha: 0.95, duration: 140 }, { alpha: 0, duration: PRINT_LIFE_MS, ease: 'Sine.In' }],
      onComplete: () => print.destroy(),
    });
    this.step++;
  }

  /** A waymark was reached. */
  celebrate(point: { x: number; y: number }): void {
    const burst = this.scene.add.particles(point.x, point.y, 'environment-glow', {
      speed: { min: 60, max: 160 }, scale: { start: 0.16, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: 700, tint: this.tint, blendMode: 'ADD', emitting: false,
    }).setDepth(99998);
    burst.explode(18);
    this.scene.time.delayedCall(900, () => burst.destroy());
    const ring = this.scene.add.circle(point.x, point.y, 16, this.tint, 0).setStrokeStyle(3, this.tint).setDepth(99998);
    this.scene.tweens.add({ targets: ring, scale: 4, alpha: 0, duration: 700, onComplete: () => ring.destroy() });
  }
}
