import Phaser from 'phaser';
import { birthdayGift } from '../data/birthdayGift';
import { riderAppearances } from '../data/riderAppearances';
import type { RiderAppearanceId } from '../data/riderAppearances';

/** Creates Hana only; her horse is chosen in the Meet Your Horse quest. */
export class CharacterCreatorScene extends Phaser.Scene {
  private selectedIndex = 0;
  private preview!: Phaser.GameObjects.Image;
  private nameText!: Phaser.GameObjects.Text;

  constructor() {
    super('CharacterCreator');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.image(0, 0, 'environment-ground').setOrigin(0).setScale(2);
    this.add.rectangle(width / 2, height / 2, width, height, 0x203f31, 0.5);
    this.add.rectangle(width / 2, height / 2, 620, 458, 0x4c3828).setStrokeStyle(4, 0xc4a574);
    this.add.text(width / 2, 80, `Create ${birthdayGift.recipient}`, {
      color: '#fff0d1', fontFamily: 'Georgia, serif', fontSize: '32px',
    }).setOrigin(0.5);
    this.add.text(width / 2, 117, 'Choose a look for the Sunmeadow trails', {
      color: '#cee0bf', fontFamily: 'Arial, sans-serif', fontSize: '15px',
    }).setOrigin(0.5);
    this.add.rectangle(width / 2, 281, 350, 270, 0xeee0bd).setStrokeStyle(3, 0xa18455);
    this.add.rectangle(width / 2, 274, 328, 134, 0xd2d9b1);
    this.add.rectangle(width / 2, 333, 328, 16, 0xb7c79b);
    this.add.text(width / 2, 177, birthdayGift.recipient.toUpperCase(), {
      color: '#49644d', fontFamily: 'Arial, sans-serif', fontSize: '13px', letterSpacing: 2,
    }).setOrigin(0.5);
    this.preview = this.add.image(width / 2, 276, 'riders', 0).setScale(2);
    this.nameText = this.add.text(width / 2, 367, '', {
      color: '#4c3828', fontFamily: 'Georgia, serif', fontSize: '22px',
    }).setOrigin(0.5);
    this.add.text(width / 2, 398, '←  Left / Right  →', {
      color: '#596343', fontFamily: 'Arial, sans-serif', fontSize: '14px',
    }).setOrigin(0.5);
    this.add.rectangle(width / 2, 458, 320, 44, 0x315b4e).setStrokeStyle(2, 0x99c0a4);
    this.add.text(width / 2, 458, 'Enter · Begin your adventure', {
      color: '#fff0d1', fontFamily: 'Arial, sans-serif', fontSize: '17px',
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
    this.preview.setFrame(this.selectedIndex * 12);
    this.nameText.setText(`${appearance.name} look`);
  }
}
