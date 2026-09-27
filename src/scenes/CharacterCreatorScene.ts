import Phaser from 'phaser';
import { horses } from '../data/horses';
import type { HorseId } from '../data/horses';
import { HorseEntity } from '../entities/HorseEntity';
import { riderAppearances } from '../data/riderAppearances';
import type { RiderAppearanceId } from '../data/riderAppearances';

export class CharacterCreatorScene extends Phaser.Scene {
  private selectedIndex = 0;
  private preview!: Phaser.GameObjects.Image;
  private nameText!: Phaser.GameObjects.Text;
  private horseIndex = 0;
  private horsePreview!: HorseEntity;
  private horseNameText!: Phaser.GameObjects.Text;

  constructor() {
    super('CharacterCreator');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.image(0, 0, 'environment-ground').setOrigin(0).setScale(2);
    this.add.rectangle(width / 2, height / 2, width, height, 0x203f31, 0.5);
    this.add.rectangle(width / 2, height / 2, 820, 458, 0x4c3828).setStrokeStyle(4, 0xc4a574);
    this.add.text(width / 2, 80, 'Choose your rider and horse', {
      color: '#fff0d1', fontFamily: 'Georgia, serif', fontSize: '32px',
    }).setOrigin(0.5);
    this.add.text(width / 2, 117, 'Your first companions on the Sunmeadow trails', {
      color: '#cee0bf', fontFamily: 'Arial, sans-serif', fontSize: '15px',
    }).setOrigin(0.5);
    for (const x of [290, 670]) {
      this.add.rectangle(x, 281, 350, 270, 0xeee0bd).setStrokeStyle(3, 0xa18455);
      this.add.rectangle(x, 274, 328, 134, 0xd2d9b1);
      this.add.rectangle(x, 333, 328, 16, 0xb7c79b);
    }
    this.add.text(290, 177, 'YOUR RIDER', {
      color: '#49644d', fontFamily: 'Arial, sans-serif', fontSize: '13px', letterSpacing: 2,
    }).setOrigin(0.5);
    this.add.text(670, 177, 'YOUR FIRST HORSE', {
      color: '#49644d', fontFamily: 'Arial, sans-serif', fontSize: '13px', letterSpacing: 2,
    }).setOrigin(0.5);
    this.preview = this.add.image(290, 276, 'riders', 0).setScale(2);
    this.nameText = this.add.text(290, 367, '', {
      color: '#4c3828', fontFamily: 'Georgia, serif', fontSize: '22px',
    }).setOrigin(0.5);
    this.horsePreview = new HorseEntity(this, horses[0]!, 660, 280);
    this.horsePreview.display.setScale(1.5);
    this.horseNameText = this.add.text(670, 367, '', {
      color: '#4c3828', fontFamily: 'Georgia, serif', fontSize: '20px',
    }).setOrigin(0.5);
    this.add.text(290, 398, '←  Left / Right  →', {
      color: '#596343', fontFamily: 'Arial, sans-serif', fontSize: '14px',
    }).setOrigin(0.5);
    this.add.text(670, 398, '↑  Up / Down  ↓', {
      color: '#596343', fontFamily: 'Arial, sans-serif', fontSize: '14px',
    }).setOrigin(0.5);
    this.add.rectangle(width / 2, 458, 320, 44, 0x315b4e).setStrokeStyle(2, 0x99c0a4);
    this.add.text(width / 2, 458, 'Enter · Begin your adventure', {
      color: '#fff0d1', fontFamily: 'Arial, sans-serif', fontSize: '17px',
    }).setOrigin(0.5);

    const keyboard = this.input.keyboard!;
    keyboard.on('keydown-LEFT', () => this.select(-1));
    keyboard.on('keydown-RIGHT', () => this.select(1));
    keyboard.on('keydown-UP', () => this.selectHorse(-1));
    keyboard.on('keydown-DOWN', () => this.selectHorse(1));
    keyboard.once('keydown-ENTER', () => {
      const appearanceId: RiderAppearanceId = riderAppearances[this.selectedIndex]!.id;
      const horseId: HorseId = horses[this.horseIndex]!.id;
      this.scene.start('World', { appearanceId, horseId });
    });
    this.updatePreview();
    this.updateHorsePreview();
  }

  private select(direction: number): void {
    this.selectedIndex = (this.selectedIndex + direction + riderAppearances.length) % riderAppearances.length;
    this.updatePreview();
  }

  private updatePreview(): void {
    const appearance = riderAppearances[this.selectedIndex]!;
    this.preview.setFrame(this.selectedIndex * 12);
    this.nameText.setText(appearance.name);
  }

  private selectHorse(direction: number): void {
    this.horseIndex = (this.horseIndex + direction + horses.length) % horses.length;
    this.updateHorsePreview();
  }

  private updateHorsePreview(): void {
    const horse = horses[this.horseIndex]!;
    this.horsePreview.setDefinition(horse);
    this.horseNameText.setText(`${horse.name} · ${horse.breed}`);
  }
}
