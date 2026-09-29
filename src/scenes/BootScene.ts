import Phaser from 'phaser';
import { ensureCatTextures } from '../art/CatSprites';
import { ensureFigureTextures } from '../art/EchoFigures';
import { preloadEnvironment } from '../art/Environment';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    preloadEnvironment(this);
    this.load.spritesheet('riders', '/assets/art/riders.png', { frameWidth: 32, frameHeight: 48 });
    this.load.spritesheet('horses', '/assets/art/horses.png', { frameWidth: 96, frameHeight: 80 });
    this.load.audio('sunmeadow-ambience', '/assets/sunmeadow-ambience.wav');
  }

  create(): void {
    ensureCatTextures(this);
    ensureFigureTextures(this);
    this.scene.start('MainMenu');
  }
}
