import Phaser from 'phaser';
import { cue } from '../systems/audio';

/** What an Echo minigame may use. EchoScene owns the flow; a game only draws, plays and reports `done`. */
export interface MinigameContext {
  readonly scene: Phaser.Scene;
  /** Reduced motion: skip shakes and large flashes. */
  readonly calm: boolean;
  /** Instruction line under the game; replaces the previous one. */
  hint(text: string): void;
  /** Short feedback toast, e.g. after a miss. */
  say(text: string): void;
  /** Call once when the game is won. The scene destroys the game afterwards. */
  done(): void;
  /** Plays a stage cue, e.g. an animal reacting in the room behind the game. */
  cue(name: string): void;
  /** The player's horse, as named in Meet Your Horse. */
  readonly horseName: string;
}

export interface MinigameHandle {
  destroy(): void;
}

export type Minigame = (context: MinigameContext) => MinigameHandle;

export const WIDTH = 960;
export const HEIGHT = 540;
export const FONT = 'Arial, sans-serif';
const ADD = Phaser.BlendModes.ADD;

type Point = { x: number; y: number };

/** Root container for one game. The name lets the browser test find named pieces inside it. */
export function createLayer(scene: Phaser.Scene): Phaser.GameObjects.Container {
  return scene.add.container(0, 0).setDepth(50).setName('minigame');
}

/**
 * Timers and teardown for one game. The Echo continues after `done`, so a game must not leave
 * timers, tweens or input listeners behind; route them through here and call `dispose` in `destroy`.
 */
export class GameScope {
  private readonly timers: Phaser.Time.TimerEvent[] = [];
  private readonly cleanups: (() => void)[] = [];

  constructor(private readonly scene: Phaser.Scene, readonly layer: Phaser.GameObjects.Container) {}

  after(ms: number, callback: () => void): Phaser.Time.TimerEvent {
    const timer = this.scene.time.delayedCall(ms, callback);
    this.timers.push(timer);
    return timer;
  }

  every(ms: number, callback: () => void): Phaser.Time.TimerEvent {
    const timer = this.scene.time.addEvent({ delay: ms, loop: true, callback });
    this.timers.push(timer);
    return timer;
  }

  /** Registers teardown, e.g. removing a scene input or keyboard listener. */
  onDispose(cleanup: () => void): void {
    this.cleanups.push(cleanup);
  }

  dispose(): void {
    for (const timer of this.timers) timer.remove(false);
    for (const cleanup of this.cleanups) cleanup();
    const kill = (object: Phaser.GameObjects.GameObject): void => {
      this.scene.tweens.killTweensOf(object);
      if (object instanceof Phaser.GameObjects.Container) object.list.forEach(kill);
    };
    kill(this.layer);
    this.layer.destroy();
  }
}

export function glow(scene: Phaser.Scene, x: number, y: number, tint: number, scale: number, alpha: number): Phaser.GameObjects.Image {
  return scene.add.image(x, y, 'environment-glow').setTint(tint).setScale(scale).setAlpha(alpha).setBlendMode(ADD);
}

/** A one-shot sparkle burst. */
export function burst(scene: Phaser.Scene, x: number, y: number, tint: number, count = 12, speed = 140): void {
  const emitter = scene.add.particles(x, y, 'environment-glow', {
    speed: { min: speed * 0.3, max: speed }, angle: { min: 0, max: 360 }, scale: { start: 0.14, end: 0 },
    alpha: { start: 0.9, end: 0 }, lifespan: 650, tint, blendMode: 'ADD', emitting: false,
  }).setDepth(90);
  emitter.explode(count);
  scene.time.delayedCall(800, () => emitter.destroy());
}

export function floatText(scene: Phaser.Scene, x: number, y: number, text: string, color = '#fff0d1', size = 18): void {
  const label = scene.add.text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color, stroke: '#1d1a22', strokeThickness: 3 })
    .setOrigin(0.5).setDepth(95);
  scene.tweens.add({ targets: label, y: y - 38, alpha: 0, duration: 1300, ease: 'Sine.Out', onComplete: () => label.destroy() });
}

export function text(scene: Phaser.Scene, x: number, y: number, value: string, size = 16, color = '#fff0d1'): Phaser.GameObjects.Text {
  return scene.add.text(x, y, value, { fontFamily: FONT, fontSize: `${size}px`, color, align: 'center' }).setOrigin(0.5);
}

/** A clickable canvas button; `name` lets the browser test click it. */
export function canvasButton(scene: Phaser.Scene, x: number, y: number, label: string, name: string, onClick: () => void): Phaser.GameObjects.Container {
  const background = scene.add.rectangle(0, 0, Math.max(120, label.length * 11 + 36), 44, 0x355e53).setStrokeStyle(2, 0xb99b63);
  const caption = text(scene, 0, 0, label, 17);
  const container = scene.add.container(x, y, [background, caption]).setSize(background.width, 44).setName(name);
  container.setInteractive({ useHandCursor: true })
    .on('pointerover', () => { background.setFillStyle(0x42745f); cue(scene, 'ui-hover'); })
    .on('pointerout', () => background.setFillStyle(0x355e53))
    .on('pointerdown', () => { cue(scene, 'ui-select'); onClick(); });
  return container;
}

export interface DragOptions {
  /** How close a drop must land to a slot, in pixels. */
  snap?: number;
  onPlace(index: number): void;
  onMiss(index: number): void;
  onDone(): void;
}

/**
 * Piece `i` belongs in slot `i`. Right drops lock in place, wrong drops glide home with `onMiss`,
 * drops far from any slot just glide home. Pieces need a size so their container is hit-testable.
 */
export function dragToSlots(scene: Phaser.Scene, pieces: readonly Phaser.GameObjects.Container[], slots: readonly Point[], options: DragOptions): void {
  const snap = options.snap ?? 60;
  let placed = 0;
  pieces.forEach((piece, index) => {
    const home = { x: piece.x, y: piece.y };
    piece.setInteractive({ draggable: true, useHandCursor: true });
    piece.on('dragstart', () => {
      cue(scene, 'ui-select', 0.5);
      piece.parentContainer?.bringToTop(piece);
      scene.tweens.add({ targets: piece, scale: 1.08, duration: 90 });
    });
    piece.on('drag', (_pointer: Phaser.Input.Pointer, x: number, y: number) => piece.setPosition(x, y));
    piece.on('dragend', () => {
      let nearest = -1;
      let best = snap;
      slots.forEach((slot, slotIndex) => {
        const distance = Phaser.Math.Distance.Between(piece.x, piece.y, slot.x, slot.y);
        if (distance < best) { best = distance; nearest = slotIndex; }
      });
      if (nearest === index) {
        piece.disableInteractive();
        scene.tweens.add({ targets: piece, x: slots[index]!.x, y: slots[index]!.y, scale: 1, duration: 140, ease: 'Back.Out' });
        placed++;
        options.onPlace(index);
        if (placed === pieces.length) options.onDone();
        return;
      }
      if (nearest >= 0) options.onMiss(index);
      scene.tweens.add({ targets: piece, ...home, scale: 1, duration: 260, ease: 'Sine.Out' });
    });
  });
}
