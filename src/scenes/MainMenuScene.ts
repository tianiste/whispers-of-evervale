import Phaser from 'phaser';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 28, 'Whispers of Evervale', {
        color: '#f4e9cf',
        fontFamily: 'Georgia, serif',
        fontSize: '42px',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 30, 'Press Enter to explore', {
        color: '#a9c9b7',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
      })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('CharacterCreator'));
  }
}
