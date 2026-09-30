import Phaser from 'phaser';
import { cue } from '../systems/audio';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';
import { bolt } from '../data/village';

type Point = { x: number; y: number };

const SCALE = 1.6;
const LIFT = 12 * SCALE;
const NEAR_RADIUS = 220;
const STOP_DISTANCE = 50;
const HOME_RADIUS = 180;
const THINK_MS = 600;
const SWIM_MIN_MS = 6000;
const SWIM_MAX_MS = 8000;
const TAIL_BASE: Point = { x: -22, y: 0 };
const TAIL_REST_ANGLE = -155;
const BALL_MOUTH: Point = { x: 27, y: -3 };
const BALL_GROUND: Point = { x: 22, y: 20 };

/**
 * Bolt, the mystery dog at the pond. A PNG loaded under `bolt` in BootScene replaces the
 * generated texture from BoltSprite.ts; `bolt-tail` and `bolt-ball` follow the same rule.
 */
export class BoltEntity {
  readonly display: Phaser.GameObjects.Container;
  /** The dog itself; flips to face its heading while the name label and bubble stay readable. */
  private readonly dog: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Image;
  private readonly tail: Phaser.GameObjects.Image;
  private readonly ball: Phaser.GameObjects.Image;
  private readonly bubble: Phaser.GameObjects.Text;
  private wagTween: Phaser.Tweens.Tween;
  private wagFast = false;
  private lineIndex = 0;
  private nextThinkAt = 0;
  private nextSwimAt = 0;
  private moving = false;
  private busy = false;
  private shown = true;
  private audible = false;
  private nextVoiceAt = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.tail = scene.add.image(TAIL_BASE.x, TAIL_BASE.y, 'bolt-tail').setOrigin(0, 0.5).setScale(SCALE).setAngle(TAIL_REST_ANGLE);
    this.body = scene.add.image(0, 0, 'bolt').setScale(SCALE);
    this.ball = scene.add.image(BALL_MOUTH.x, BALL_MOUTH.y, 'bolt-ball').setScale(SCALE);
    const label = scene.add.text(0, -LIFT - 6, bolt.name, {
      color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '11px', backgroundColor: '#173b36cc', padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 1);
    this.bubble = scene.add.text(0, -LIFT - 26, '', {
      color: '#1d1a22', fontFamily: 'Arial, sans-serif', fontSize: '12px', fontStyle: 'bold', backgroundColor: '#f4efe6', padding: { x: 5, y: 3 },
    }).setOrigin(0.5, 1).setVisible(false);
    this.dog = scene.add.container(0, 0, [this.tail, this.body, this.ball]);
    this.display = scene.add.container(bolt.x, bolt.y, [this.dog, label, this.bubble]);
    this.wagTween = scene.tweens.add({ targets: this.tail, angle: TAIL_REST_ANGLE + 18, duration: 260, yoyo: true, repeat: -1 });
  }

  get x(): number { return this.display.x; }
  get y(): number { return this.display.y; }

  update(time: number, player: Point): void {
    if (!this.shown) return;
    this.display.setDepth(this.display.y + 16);
    const distance = Phaser.Math.Distance.Between(player.x, player.y, this.x, this.y);
    this.audible = distance < 380;
    if (distance < NEAR_RADIUS && time >= this.nextVoiceAt) {
      cue(this.scene, 'dog-pant', 0.55);
      this.nextVoiceAt = time + 14000;
    }
    this.updateWag(distance < NEAR_RADIUS);
    if (this.moving || this.busy || time < this.nextThinkAt) return;
    this.nextThinkAt = time + THINK_MS;
    if (distance < NEAR_RADIUS) {
      this.moveTo(this.clampHome(this.stopNear(player, STOP_DISTANCE)), 600);
    } else if (time >= this.nextSwimAt) {
      this.goSwim();
    } else if (Phaser.Math.Distance.Between(this.x, this.y, bolt.x, bolt.y) > 20) {
      this.moveTo({ x: bolt.x, y: bolt.y }, 900);
    }
  }

  pet(time: number, player: Point): string {
    const line = bolt.lines[this.lineIndex % bolt.lines.length]!;
    this.lineIndex++;
    if (!this.busy) {
      this.busy = true;
      cue(this.scene, this.lineIndex % 3 === 0 ? 'dog-bark' : 'dog-pant');
      cue(this.scene, 'toy', 0.65);
      this.nextThinkAt = time + 400;
      this.dog.setScale(player.x < this.x ? -1 : 1, 1);
      this.ball.setPosition(BALL_GROUND.x, BALL_GROUND.y);
      this.heart();
      this.say('!');
      this.wagTween.remove();
      this.tail.setAngle(TAIL_REST_ANGLE);
      this.wagTween = this.scene.tweens.add({ targets: this.tail, angle: TAIL_REST_ANGLE + 24, duration: 70, yoyo: true, repeat: -1 });
      this.scene.time.delayedCall(1600, () => {
        this.ball.setPosition(BALL_MOUTH.x, BALL_MOUTH.y);
        if (this.audible) cue(this.scene, 'toy', 0.45);
        this.busy = false;
        this.wagFast = false;
      });
    }
    return line;
  }

  setVisible(visible: boolean): void {
    this.shown = visible;
    this.display.setVisible(visible);
  }

  private updateWag(near: boolean): void {
    if (near === this.wagFast) return;
    this.wagFast = near;
    this.wagTween.remove();
    this.tail.setAngle(TAIL_REST_ANGLE);
    this.wagTween = this.scene.tweens.add({ targets: this.tail, angle: TAIL_REST_ANGLE + 18, duration: near ? 90 : 260, yoyo: true, repeat: -1 });
  }

  private goSwim(): void {
    this.busy = true;
    this.moveTo({ x: bolt.water.x, y: bolt.water.y }, 900);
    this.scene.time.delayedCall(950, () => {
      this.say('*splash*');
      if (this.audible) cue(this.scene, 'splash', 0.6);
      this.ripples();
      const swimBob = this.scene.tweens.add({ targets: this.body, y: 5, duration: 260, yoyo: true, repeat: -1 });
      this.scene.time.delayedCall(1800, () => {
        swimBob.remove();
        this.body.y = 0;
        this.moveTo({ x: bolt.x, y: bolt.y }, 900);
        this.scene.time.delayedCall(950, () => {
          this.shakeOff();
          this.nextSwimAt = this.scene.time.now + Phaser.Math.Between(SWIM_MIN_MS, SWIM_MAX_MS);
          this.busy = false;
        });
      });
    });
  }

  private ripples(): void {
    for (let i = 0; i < 3; i++) {
      this.scene.time.delayedCall(i * 260, () => {
        const ring = this.scene.add.ellipse(bolt.water.x, bolt.water.y, 8, 5, 0xbfe4f2, 0.45).setDepth(bolt.water.y - 1);
        this.scene.tweens.add({ targets: ring, scaleX: 4.5, scaleY: 3.5, alpha: 0, duration: 900, onComplete: () => ring.destroy() });
      });
    }
  }

  private shakeOff(): void {
    if (this.audible) cue(this.scene, 'rustle', 0.5);
    this.display.setAngle(-8);
    this.scene.tweens.add({ targets: this.display, angle: 8, duration: 80, yoyo: true, repeat: 3, onComplete: () => this.display.setAngle(0) });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const drop = this.scene.add.circle(this.x, this.y - 12, 2, 0xbfe4f2, 0.85).setDepth(this.y + 20);
      this.scene.tweens.add({
        targets: drop, x: this.x + Math.cos(angle) * 20, y: this.y - 12 + Math.sin(angle) * 12, alpha: 0, duration: 500,
        onComplete: () => drop.destroy(),
      });
    }
  }

  private heart(): void {
    const heart = this.scene.add.text(0, -LIFT - 6, '♥', {
      color: '#ff6f91', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontStyle: 'bold',
    }).setOrigin(0.5, 1);
    this.display.add(heart);
    this.scene.tweens.add({ targets: heart, y: heart.y - 20, alpha: 0, duration: 900, ease: 'Sine.Out', onComplete: () => heart.destroy() });
  }

  private stopNear(player: Point, distance: number): Point {
    const angle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
    return { x: player.x + Math.cos(angle) * distance, y: player.y + Math.sin(angle) * distance };
  }

  private clampHome(point: Point): Point {
    const distance = Phaser.Math.Distance.Between(point.x, point.y, bolt.x, bolt.y);
    const scale = distance > HOME_RADIUS ? HOME_RADIUS / distance : 1;
    return {
      x: Phaser.Math.Clamp(bolt.x + (point.x - bolt.x) * scale, 60, WORLD_WIDTH - 60),
      y: Phaser.Math.Clamp(bolt.y + (point.y - bolt.y) * scale, 60, WORLD_HEIGHT - 60),
    };
  }

  private moveTo(target: Point, duration: number): void {
    if (Phaser.Math.Distance.Between(target.x, target.y, this.x, this.y) < 6) return;
    this.moving = true;
    this.dog.setScale(target.x < this.x ? -1 : 1, 1);
    const bounce = this.scene.tweens.add({ targets: this.body, y: -3, duration: 140, yoyo: true, repeat: -1 });
    this.scene.tweens.add({
      targets: this.display, x: target.x, y: target.y, duration, ease: 'Sine.InOut',
      onComplete: () => { this.moving = false; bounce.remove(); this.body.y = 0; },
    });
  }

  private say(text: string): void {
    this.bubble.setText(text).setVisible(true);
    this.scene.time.delayedCall(1200, () => this.bubble.setVisible(false));
  }
}
