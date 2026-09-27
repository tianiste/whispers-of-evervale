import Phaser from 'phaser';
import { riderAppearances } from '../data/riderAppearances';
import type { RiderAppearanceId } from '../data/riderAppearances';

export class CharacterCreatorScene extends Phaser.Scene {
  private selectedIndex = 0;
  private preview!: Phaser.GameObjects.Arc;
  private nameText!: Phaser.GameObjects.Text;

  constructor() {
    super('CharacterCreator');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2 - 125, 'Choose your rider', {
      color: '#f4e9cf', fontFamily: 'Georgia, serif', fontSize: '34px',
    }).setOrigin(0.5);
    this.preview = this.add.circle(width / 2, height / 2 - 35, 32, riderAppearances[0].color)
      .setStrokeStyle(4, 0x173b36);
    this.nameText = this.add.text(width / 2, height / 2 + 20, '', {
      color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '22px',
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 + 85, '← / → Change    Enter Confirm', {
      color: '#a9c9b7', fontFamily: 'Arial, sans-serif', fontSize: '17px',
    }).setOrigin(0.5);

    const keyboard = this.input.keyboard!;
    keyboard.on('keydown-LEFT', () => this.select(-1));
    keyboard.on('keydown-RIGHT', () => this.select(1));
    keyboard.once('keydown-ENTER', () => {
      const appearanceId: RiderAppearanceId = riderAppearances[this.selectedIndex]!.id;
      this.scene.start('World', { appearanceId });
    });
    this.updatePreview();
  }

  private select(direction: number): void {
    this.selectedIndex = (this.selectedIndex + direction + riderAppearances.length) % riderAppearances.length;
    this.updatePreview();
  }

  private updatePreview(): void {
    const appearance = riderAppearances[this.selectedIndex]!;
    this.preview.setFillStyle(appearance.color);
    this.nameText.setText(appearance.name);
  }
}
