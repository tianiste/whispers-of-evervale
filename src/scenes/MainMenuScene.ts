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

    this.add
      .text(width / 2, height / 2 - 28, 'Whispers of Evervale', {
        color: '#f4e9cf',
        fontFamily: 'Georgia, serif',
        fontSize: '42px',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 30, this.savedGame ? 'Press Enter to continue' : 'Press Enter to explore', {
        color: '#a9c9b7',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
      })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-ENTER', () => {
      if (this.savedGame) this.scene.start('World', { save: this.savedGame });
      else this.scene.start('CharacterCreator');
    });
  }
}
