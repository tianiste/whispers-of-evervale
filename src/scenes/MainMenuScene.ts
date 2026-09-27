import Phaser from 'phaser';
import { loadGameSave, type GameSave } from '../data/save';

export class MainMenuScene extends Phaser.Scene {
  private savedGame: GameSave | null = null;

  constructor() {
    super('MainMenu');
  }

  create(): void {
    const { width, height } = this.scale;
    this.savedGame = loadGameSave();

    this.add.image(0, 0, 'environment-ground').setOrigin(0).setScale(2);
    this.add.rectangle(width / 2, height / 2, width, height, 0x183b34, 0.36);
    this.add.rectangle(width / 2 + 6, height / 2 + 6, 652, 244, 0x192b25, 0.65);
    this.add.rectangle(width / 2, height / 2, 652, 244, 0x4b3527)
      .setStrokeStyle(4, 0xc1a16b);
    this.add.rectangle(width / 2, height / 2, 628, 220, 0x543d2b)
      .setStrokeStyle(2, 0x80633f);
    this.add.text(width / 2, height / 2 - 75, 'A COUNTRYSIDE ADVENTURE', {
      color: '#afd6bd', fontFamily: 'Arial, sans-serif', fontSize: '13px', letterSpacing: 3,
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 - 23, 'Whispers of Evervale', {
      color: '#fff0d1', fontFamily: 'Georgia, serif', fontSize: '44px',
      shadow: { offsetX: 2, offsetY: 3, color: '#2a221b', fill: true },
    }).setOrigin(0.5);
    this.add.rectangle(width / 2, height / 2 + 51, 332, 48, 0x315b4e)
      .setStrokeStyle(2, 0x94bea1);
    this.add.text(width / 2, height / 2 + 51, this.savedGame ? 'Press Enter to continue' : 'Press Enter to explore', {
      color: '#fff0d1', fontFamily: 'Arial, sans-serif', fontSize: '18px',
    }).setOrigin(0.5);
    this.add.text(width / 2, height - 40, 'Sunlit trails. A faithful horse. A little mystery.', {
      color: '#fff0d1', fontFamily: 'Georgia, serif', fontSize: '17px',
      backgroundColor: '#2b3b2d', padding: { x: 16, y: 8 },
    }).setOrigin(0.5);

    this.input.keyboard?.once('keydown-ENTER', () => {
      if (this.savedGame) this.scene.start('World', { save: this.savedGame });
      else this.scene.start('CharacterCreator');
    });
  }
}
