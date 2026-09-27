import Phaser from 'phaser';
import { preloadEnvironment } from '../art/Environment';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    preloadEnvironment(this);
    this.load.spritesheet('riders', '/assets/art/riders.png', { frameWidth: 32, frameHeight: 48 });
    this.load.spritesheet('horses', '/assets/art/horses.png', { frameWidth: 96, frameHeight: 80 });
    this.load.spritesheet('cats', '/assets/art/cats.png', { frameWidth: 24, frameHeight: 24 });
    this.load.audio('sunmeadow-ambience', '/assets/sunmeadow-ambience.wav');
  }

  create(): void {
    this.scene.start('MainMenu');
  }
}
