import Phaser from 'phaser';
import type { DialogueDefinition } from '../data/dialogue';

export class DialogueBox {
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly speaker: Phaser.GameObjects.Text;
  private readonly message: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private open = false;

  constructor(scene: Phaser.Scene) {
    const { width, height } = scene.scale;
    this.background = scene.add.rectangle(width / 2, height - 72, width - 48, 112, 0x173b36, 0.96)
      .setStrokeStyle(2, 0xc8b77b)
      .setScrollFactor(0)
      .setVisible(false);
    this.speaker = scene.add.text(40, height - 116, '', {
      color: '#e6cc83', fontFamily: 'Georgia, serif', fontSize: '19px',
    }).setScrollFactor(0).setVisible(false);
    this.message = scene.add.text(40, height - 84, '', {
      color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '16px',
      wordWrap: { width: width - 80 },
    }).setScrollFactor(0).setVisible(false);
    this.hint = scene.add.text(width - 40, height - 42, 'Enter / Space: close', {
      color: '#a9c9b7', fontFamily: 'Arial, sans-serif', fontSize: '12px',
    }).setOrigin(1, 0.5).setScrollFactor(0).setVisible(false);
  }

  get isOpen(): boolean {
    return this.open;
  }

  show(dialogue: DialogueDefinition): void {
    this.speaker.setText(dialogue.speaker).setVisible(true);
    this.message.setText(dialogue.message).setVisible(true);
    this.hint.setVisible(true);
    this.background.setVisible(true);
    this.open = true;
  }

  hide(): void {
    this.background.setVisible(false);
    this.speaker.setVisible(false);
    this.message.setVisible(false);
    this.hint.setVisible(false);
    this.open = false;
  }
}
