import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.audio('sunmeadow-ambience', '/assets/sunmeadow-ambience.wav');
  }

  create(): void {
    this.scene.start('MainMenu');
  }
}
