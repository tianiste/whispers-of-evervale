import Phaser from 'phaser';
import { loadGameSave, type GameSave } from '../data/save';
import { storeVolume } from '../data/settings';

interface MenuItem {
  /** Object name, so the browser test can find the button. */
  name: string;
  label: () => string;
  action: () => void;
  /** Left/right on a setting row. */
  adjust?: (direction: number) => void;
}

const BUTTON = { width: 300, height: 42, fill: 0x315b4e, hover: 0x42745f, stroke: 0x94bea1, selected: 0xa6dfce };

/** Title screen: Continue (only with a valid save), New Game (confirms before replacing it) and Settings. */
export class MainMenuScene extends Phaser.Scene {
  private savedGame: GameSave | null = null;
  private rows: { item: MenuItem; box: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text }[] = [];
  private selected = 0;
  private message!: Phaser.GameObjects.Text;
  private leaving = false;

  constructor() {
    super('MainMenu');
  }

  create(): void {
    const { width, height } = this.scale;
    this.savedGame = loadGameSave();
    this.rows = [];
    this.leaving = false;

    this.add.image(0, 0, 'environment-ground').setOrigin(0).setScale(2);
    this.add.rectangle(width / 2, height / 2, width, height, 0x183b34, 0.36);
    this.add.rectangle(width / 2 + 6, 276, 652, 330, 0x192b25, 0.65);
    this.add.rectangle(width / 2, 270, 652, 330, 0x4b3527).setStrokeStyle(4, 0xc1a16b);
    this.add.rectangle(width / 2, 270, 628, 306, 0x543d2b).setStrokeStyle(2, 0x80633f);
    this.add.text(width / 2, 148, 'A COUNTRYSIDE ADVENTURE', {
      color: '#afd6bd', fontFamily: 'Arial, sans-serif', fontSize: '13px', letterSpacing: 3,
    }).setOrigin(0.5);
    this.add.text(width / 2, 194, 'Whispers of Evervale', {
      color: '#fff0d1', fontFamily: 'Georgia, serif', fontSize: '44px',
      shadow: { offsetX: 2, offsetY: 3, color: '#2a221b', fill: true },
    }).setOrigin(0.5);
    this.message = this.add.text(width / 2, 244, '', {
      color: '#e9d7ac', fontFamily: 'Georgia, serif', fontSize: '16px', align: 'center', wordWrap: { width: 560 },
    }).setOrigin(0.5);
    this.add.text(width / 2, height - 40, 'Sunlit trails. A faithful horse. A little mystery.', {
      color: '#fff0d1', fontFamily: 'Georgia, serif', fontSize: '17px',
      backgroundColor: '#2b3b2d', padding: { x: 16, y: 8 },
    }).setOrigin(0.5);

    const onKey = (event: KeyboardEvent): void => {
      if (this.leaving || event.repeat) return;
      const row = this.rows[this.selected];
      if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') this.select(this.selected + 1);
      else if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') this.select(this.selected - 1);
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') row?.item.adjust?.(event.key === 'ArrowLeft' ? -1 : 1);
      else if (event.key === 'Enter' || event.key === ' ') row?.item.action();
      else if (event.key === 'Escape') this.showMain();
    };
    this.input.keyboard?.on('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown', onKey));
    this.showMain();
  }

  private showMain(): void {
    this.message.setText('');
    const items: MenuItem[] = [];
    const save = this.savedGame;
    if (save) items.push({ name: 'menu-continue', label: () => 'Continue', action: () => this.leave('World', { save }) });
    items.push({ name: 'menu-new', label: () => 'New Game', action: () => (save ? this.showConfirm() : this.leave('CharacterCreator')) });
    items.push({ name: 'menu-settings', label: () => 'Settings', action: () => this.showSettings() });
    this.build(items);
  }

  private showConfirm(): void {
    this.message.setText('Start a new game? Your saved progress will be replaced.');
    this.build([
      { name: 'confirm-keep', label: () => 'Keep my save', action: () => this.showMain() },
      { name: 'confirm-new', label: () => 'Start over', action: () => this.leave('CharacterCreator') },
    ]);
  }

  private showSettings(): void {
    this.message.setText('Settings');
    const change = (direction: number): void => {
      const volume = Phaser.Math.Clamp(Math.round(this.sound.volume * 10 + direction) / 10, 0, 1);
      this.sound.volume = volume;
      storeVolume(volume);
      this.refresh();
    };
    this.build([
      {
        name: 'settings-volume', label: () => `Sound  ◀  ${Math.round(this.sound.volume * 100)}%  ▶`,
        // A click steps up and wraps to silence after full volume.
        action: () => change(this.sound.volume >= 1 ? -10 : 1), adjust: change,
      },
      { name: 'settings-back', label: () => 'Back', action: () => this.showMain() },
    ], 0);
  }

  private build(items: MenuItem[], selected = 0): void {
    for (const row of this.rows) { row.box.destroy(); row.text.destroy(); }
    const x = this.scale.width / 2;
    this.rows = items.map((item, index) => {
      const y = 290 + index * 52;
      const box = this.add.rectangle(x, y, BUTTON.width, BUTTON.height, BUTTON.fill).setStrokeStyle(2, BUTTON.stroke).setName(item.name)
        .setInteractive({ useHandCursor: true });
      const text = this.add.text(x, y, item.label(), { color: '#fff0d1', fontFamily: 'Arial, sans-serif', fontSize: '18px' }).setOrigin(0.5);
      box.on('pointerover', () => this.select(index));
      box.on('pointerdown', () => { if (!this.leaving) item.action(); });
      return { item, box, text };
    });
    this.select(selected);
  }

  private select(index: number): void {
    if (!this.rows.length) return;
    this.selected = (index + this.rows.length) % this.rows.length;
    this.refresh();
  }

  private refresh(): void {
    this.rows.forEach((row, index) => {
      const active = index === this.selected;
      row.box.setFillStyle(active ? BUTTON.hover : BUTTON.fill).setStrokeStyle(active ? 3 : 2, active ? BUTTON.selected : BUTTON.stroke);
      row.text.setText(active ? `›  ${row.item.label()}  ‹` : row.item.label());
    });
  }

  private leave(key: 'World' | 'CharacterCreator', data?: { save: GameSave }): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(250, 16, 44, 43);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(key, data));
  }
}
