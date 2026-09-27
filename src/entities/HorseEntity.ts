import Phaser from 'phaser';
import type { HorseDefinition } from '../data/horses';

export class HorseEntity {
  private facing = 1;
  private definition: HorseDefinition;
  readonly display: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, definition: HorseDefinition, x: number, y: number) {
    this.definition = definition;
    this.display = scene.add.graphics().setPosition(x, y);
    this.setDefinition(definition);
  }

  setFacing(horizontal: number): void {
    if (Math.abs(horizontal) < 0.1 || Math.sign(horizontal) === this.facing) return;
    this.facing = Math.sign(horizontal);
    this.setDefinition(this.definition);
  }

  setDefinition(definition: HorseDefinition): void {
    this.definition = definition;
    const horse = this.display.clear();
    horse.save();
    horse.scaleCanvas(this.facing, 1);
    const darkCoat = Phaser.Display.Color.ValueToColor(definition.coatColor).darken(35).color;

    horse.fillStyle(darkCoat);
    horse.fillRect(-22, 8, 7, 28);
    horse.fillRect(-8, 10, 7, 26);
    horse.fillRect(9, 9, 7, 27);
    horse.fillRect(20, 4, 7, 32);

    horse.fillStyle(definition.coatColor);
    horse.fillEllipse(0, 0, 62, 34);
    horse.fillTriangle(12, -9, 30, -37, 39, -7);
    horse.fillEllipse(36, -32, 24, 17);
    horse.fillTriangle(37, -41, 40, -52, 44, -40);

    horse.fillStyle(darkCoat);
    horse.fillTriangle(8, -13, 25, -39, 31, -16);
    horse.fillTriangle(39, -47, 40, -53, 44, -42);
    horse.fillEllipse(-28, -3, 20, 9);
    horse.restore();
  }
}
