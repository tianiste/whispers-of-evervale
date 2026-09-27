import Phaser from 'phaser';
import { horses, type HorseDefinition } from '../data/horses';

export class HorseEntity {
  private index = 0;
  facing = 1;
  private readonly sprite: Phaser.GameObjects.Image;
  readonly display: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, definition: HorseDefinition, x: number, y: number) {
    const shadow = scene.add.ellipse(0, 23, 82, 20, 0x203b32, 0.3);
    this.sprite = scene.add.image(0, -12, 'horses').setScale(1.25);
    this.display = scene.add.container(x, y, [shadow, this.sprite]);
    this.setDefinition(definition);
  }

  setFacing(horizontal: number): void {
    if (Math.abs(horizontal) > 0.1) {
      this.facing = Math.sign(horizontal);
      this.sprite.setFlipX(horizontal < 0);
    }
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
