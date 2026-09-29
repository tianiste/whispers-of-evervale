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
  private spot = 0;
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
    this.display.setDepth(this.display.y + 16);
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
    } else if (behavior === 'skittish' && distance < 110 && this.flees < 2) {
      this.flees++;
      this.moveTo(this.clampHome(this.awayFrom(player, 170), 320), 450);
    } else if (behavior === 'loud' && distance < 260 && Math.random() < 0.12) {
      this.say('MRRAOW!');
    } else if (behavior === 'confused' && Math.random() < 0.25) {
      this.sprite.toggleFlipX();
    }
  }

  pet(time: number, player: Point): string {
    const { behavior, lines } = this.definition;
    this.petCount = behavior !== 'nearby' || time - this.lastPetAt < NOMI_PATIENCE_MS ? this.petCount + 1 : 1;
    this.lastPetAt = time;
    if (behavior === 'nearby') {
      const line = lines[Math.min(this.petCount, lines.length) - 1]!;
      if (this.petCount >= lines.length) {
        this.restUntil = time + 6000;
        this.moveTo(this.clampHome(this.awayFrom(player, 70), 220), 700);
        this.petCount = 0;
      }
      return line;
    }
    const line = lines[(this.petCount - 1) % lines.length]!;
    if (behavior === 'loud') this.say('MRRRAOW!');
    if (behavior === 'skittish') { this.flees = 0; this.nextThinkAt = time + 500; }
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
        this.scene.tweens.add({ targets: this.display, alpha: 1, duration: 350, onComplete: () => { this.moving = false; } });
      },
    });
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
