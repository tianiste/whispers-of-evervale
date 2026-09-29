import Phaser from 'phaser';
import { ensureAccessoryTextures } from '../art/Accessories';
import { ensureBoltTextures } from '../art/BoltSprite';
import { ensureCatTextures } from '../art/CatSprites';
import { ensureFigureTextures } from '../art/EchoFigures';
import { preloadEnvironment } from '../art/Environment';
import { loadVolume } from '../data/settings';

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
    this.sound.volume = loadVolume();
    ensureCatTextures(this);
    ensureBoltTextures(this);
    ensureAccessoryTextures(this);
    ensureFigureTextures(this);
    this.scene.start('MainMenu');
  }
}
