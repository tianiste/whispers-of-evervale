import Phaser from 'phaser';
import { horses, type HorseDefinition } from '../data/horses';

export class HorseEntity {
  private index = 0;
  private readonly ribbon: Phaser.GameObjects.Text;
  private readonly rosette: Phaser.GameObjects.Text;
  private readonly bubble: Phaser.GameObjects.Text;
  facing = 1;
  private readonly sprite: Phaser.GameObjects.Image;
  readonly display: Phaser.GameObjects.Container;

  constructor(private readonly scene: Phaser.Scene, definition: HorseDefinition, x: number, y: number) {
    const shadow = scene.add.ellipse(0, 23, 82, 20, 0x203b32, 0.3);
    this.sprite = scene.add.image(0, -12, 'horses').setScale(1.25);
    this.display = scene.add.container(x, y, [shadow, this.sprite]);
    // The birthday tack: a teal ribbon with an oak-bead edge on the bridle.
    this.ribbon = scene.add.text(30, -28, '◆', { fontSize: '16px', color: '#55cabb', stroke: '#6e4a2e', strokeThickness: 3 }).setVisible(false);
    this.rosette = scene.add.text(20, -40, '✿', { fontSize: '15px', color: '#e8b04a', stroke: '#2f5a3c', strokeThickness: 3 }).setOrigin(0.5).setVisible(false);
    this.bubble = scene.add.text(0, -70, '', {
      color: '#1d1a22', fontFamily: 'Arial, sans-serif', fontSize: '13px', fontStyle: 'bold', backgroundColor: '#f4efe6', padding: { x: 5, y: 3 },
    }).setOrigin(0.5, 1).setVisible(false);
    this.display.add([this.ribbon, this.rosette, this.bubble]);
    this.setDefinition(definition);
  }

  setTack(tack: { echo: boolean; rosette: boolean }): void {
    this.ribbon.setVisible(tack.echo);
    this.rosette.setVisible(tack.rosette);
  }

  setFacing(horizontal: number): void {
    if (Math.abs(horizontal) > 0.1) {
      this.facing = Math.sign(horizontal);
      this.sprite.setFlipX(horizontal < 0);
      this.ribbon.setX(30 * this.facing);
      this.rosette.setX(20 * this.facing);
    }
  }

  /** A little hop and a thought, e.g. when an Echo trail waymark lights up. */
  react(text: string): void {
    this.bubble.setText(text).setVisible(true).setAlpha(1);
    this.scene.tweens.add({ targets: this.sprite, y: -22, duration: 140, yoyo: true, ease: 'Sine.Out' });
    this.scene.tweens.add({ targets: this.bubble, alpha: 0, delay: 1000, duration: 300, onComplete: () => this.bubble.setVisible(false) });
  }

  animate(time: number, speed: number): void {
    this.sprite.setFrame(this.index * 4 + (speed > 40 ? Math.floor(time / 115) % 4 : 0));
    this.display.setDepth(this.display.y + 28);
  }

  setDefinition(definition: HorseDefinition): void {
    this.index = horses.findIndex(({ id }) => id === definition.id);
    this.sprite.setFrame(this.index * 4);
  }
}
