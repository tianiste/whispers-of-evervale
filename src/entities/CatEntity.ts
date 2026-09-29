import Phaser from 'phaser';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';
import type { CatDefinition } from '../data/village';

type Point = { x: number; y: number };

const THINK_MS = 900;
const NOMI_PATIENCE_MS = 8000;

/** A cat's small personality. Gameplay only reads its position and asks it to be petted. */
export class CatEntity {
  readonly display: Phaser.GameObjects.Container;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly bubble: Phaser.GameObjects.Text;
  private petCount = 0;
  private lastPetAt = -Infinity;
  private restUntil = 0;
  private nextThinkAt = 0;
  private flees = 0;
  private settled = false;
  private spot = 0;
  private onTop = false;
  private moving = false;

  constructor(private readonly scene: Phaser.Scene, readonly definition: CatDefinition) {
    const lift = 12 * definition.scale;
    this.sprite = scene.add.image(0, 0, `cat-${definition.id}`).setScale(definition.scale);
    const label = scene.add.text(0, -lift - 6, definition.name, {
      color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '11px', backgroundColor: '#173b36cc', padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 1);
    this.bubble = scene.add.text(0, -lift - 26, '', {
      color: '#1d1a22', fontFamily: 'Arial, sans-serif', fontSize: '12px', fontStyle: 'bold', backgroundColor: '#f4efe6', padding: { x: 5, y: 3 },
    }).setOrigin(0.5, 1).setVisible(false);
    this.display = scene.add.container(definition.x, definition.y, [this.sprite, label, this.bubble]);
    scene.tweens.add({ targets: this.sprite, y: -2, duration: 1800, yoyo: true, repeat: -1 });
  }

  get x(): number { return this.display.x; }
  get y(): number { return this.display.y; }

  update(time: number, player: Point): void {
    this.display.setDepth(this.onTop ? 5000 : this.display.y + 16);
    if (this.moving || time < this.nextThinkAt) return;
    this.nextThinkAt = time + THINK_MS;
    const { behavior, x: homeX, y: homeY } = this.definition;
    const distance = Phaser.Math.Distance.Between(player.x, player.y, this.x, this.y);
    if (behavior === 'nearby' && time >= this.restUntil) {
      // Nomi keeps close while you are around the stable, and wanders home otherwise.
      if (Phaser.Math.Distance.Between(player.x, player.y, homeX, homeY) < 260 && distance > 90) {
        const toward = this.awayFrom(player, 60, player);
        this.moveTo(this.clampHome(toward, 200), 1000);
      } else if (Phaser.Math.Distance.Between(this.x, this.y, homeX, homeY) > 210) this.moveTo({ x: homeX, y: homeY }, 1400);
    } else if (behavior === 'skittish' && distance < 120) {
      if (this.flees < 3) {
        this.flees++;
        this.say('!');
        this.dustPuffs();
        const fleeDistance = Phaser.Math.Between(170, 220);
        this.moveTo(this.clampHome(this.awayFrom(player, fleeDistance), 320), fleeDistance * 1.3);
      } else if (!this.settled) {
        this.settled = true;
        this.say('…fine.');
      }
    } else if (behavior === 'loud') {
      // Miki closes the gap slowly, then talks about it.
      if (distance < 260) this.moveTo(this.clampHome(this.awayFrom(player, 40, player), 300), 1800);
      if (distance < 260 && Math.random() < 0.18) this.say('MRRAOW!');
    } else if (behavior === 'confused') {
      const roll = Math.random();
      if (roll < 0.10) this.tailChase();
      else if (roll < 0.30) this.bonk();
      else if (roll < 0.55) this.sprite.toggleFlipX();
    }
  }

  pet(time: number, player: Point): string {
    const { behavior, lines } = this.definition;
    this.petCount = behavior !== 'nearby' || time - this.lastPetAt < NOMI_PATIENCE_MS ? this.petCount + 1 : 1;
    this.lastPetAt = time;
    if (behavior === 'nearby') {
      const line = lines[Math.min(this.petCount, lines.length) - 1]!;
      if (this.petCount === 1) this.heart('♥');
      if (this.petCount >= lines.length) {
        this.restUntil = time + 6000;
        this.moveTo(this.clampHome(this.awayFrom(player, 70), 220), 700);
        this.sprite.setFlipX(player.x > this.x);
        this.say('hmph.');
        this.petCount = 0;
      }
      return line;
    }
    const line = lines[(this.petCount - 1) % lines.length]!;
    if (behavior === 'loud') { this.heart('♥ ♥'); this.say('MRRRAOW!'); }
    if (behavior === 'skittish') { this.flees = 0; this.settled = false; this.nextThinkAt = time + 500; }
    if (behavior === 'wanderer') this.vanish();
    return line;
  }

  private vanish(): void {
    const spots = this.definition.spots ?? [];
    if (!spots.length) return;
    this.spot = (this.spot + 1) % spots.length;
    const next = spots[this.spot]!;
    this.moving = true;
    this.scene.tweens.add({
      targets: this.display, alpha: 0, duration: 350, delay: 500,
      onComplete: () => {
        this.display.setPosition(next.x, next.y);
        this.sprite.setAngle(next.angle ?? 0);
        this.onTop = next.onTop ?? false;
        this.say('?');
        this.scene.tweens.add({ targets: this.display, alpha: 1, duration: 350, onComplete: () => { this.moving = false; } });
      },
    });
  }

  /** Quick walk in the direction Viski is already facing, then a small startled bounce back. */
  private bonk(): void {
    const dx = this.sprite.flipX ? -24 : 24;
    const target = this.clampHome({ x: this.x + dx, y: this.y }, 60);
    this.moving = true;
    this.scene.tweens.add({
      targets: this.display, x: target.x, y: target.y, duration: 220, ease: 'Sine.In',
      onComplete: () => {
        this.say('?');
        this.scene.tweens.add({
          targets: this.display, x: target.x - dx * 0.25, duration: 120, yoyo: true, ease: 'Back.Out',
          onComplete: () => { this.moving = false; },
        });
      },
    });
  }

  /** Two full spins chasing his own tail. */
  private tailChase(): void {
    this.moving = true;
    this.say('?!');
    this.scene.tweens.add({
      targets: this.sprite, angle: this.sprite.angle + 720, duration: 1400, ease: 'Linear',
      onComplete: () => { this.sprite.setAngle(0); this.moving = false; },
    });
  }

  /** A short-lived floating heart above the cat; destroys itself when the tween completes. */
  private heart(text: string): void {
    const lift = 12 * this.definition.scale;
    const heart = this.scene.add.text(0, -lift - 6, text, {
      color: '#ff6f91', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontStyle: 'bold',
    }).setOrigin(0.5, 1);
    this.display.add(heart);
    this.scene.tweens.add({ targets: heart, y: heart.y - 20, alpha: 0, duration: 900, ease: 'Sine.Out', onComplete: () => heart.destroy() });
  }

  /** A few small dust puffs left behind by a flee, fading where the cat used to stand. */
  private dustPuffs(): void {
    for (let i = 0; i < Phaser.Math.Between(3, 4); i++) {
      const puff = this.scene.add
        .circle(this.x + Phaser.Math.Between(-8, 8), this.y + Phaser.Math.Between(-2, 6), Phaser.Math.Between(2, 3), 0xc2a878, 0.7)
        .setDepth(this.y);
      this.scene.tweens.add({ targets: puff, alpha: 0, y: puff.y - 6, duration: 500, delay: i * 40, onComplete: () => puff.destroy() });
    }
  }

  private awayFrom(from: Point, distance: number, origin: Point = this.display): Point {
    const angle = Phaser.Math.Angle.Between(from.x, from.y, this.x, this.y);
    return { x: origin.x + Math.cos(angle) * distance, y: origin.y + Math.sin(angle) * distance };
  }

  private clampHome(point: Point, radius: number): Point {
    const { x: homeX, y: homeY } = this.definition;
    const distance = Phaser.Math.Distance.Between(point.x, point.y, homeX, homeY);
    const scale = distance > radius ? radius / distance : 1;
    return {
      x: Phaser.Math.Clamp(homeX + (point.x - homeX) * scale, 60, WORLD_WIDTH - 60),
      y: Phaser.Math.Clamp(homeY + (point.y - homeY) * scale, 60, WORLD_HEIGHT - 60),
    };
  }

  private moveTo(target: Point, duration: number): void {
    if (Phaser.Math.Distance.Between(target.x, target.y, this.x, this.y) < 8) return;
    this.moving = true;
    this.sprite.setFlipX(target.x < this.x);
    this.scene.tweens.add({ targets: this.display, x: target.x, y: target.y, duration, ease: 'Sine.InOut', onComplete: () => { this.moving = false; } });
  }

  private say(text: string): void {
    this.bubble.setText(text).setVisible(true);
    this.scene.time.delayedCall(1200, () => this.bubble.setVisible(false));
  }
}
