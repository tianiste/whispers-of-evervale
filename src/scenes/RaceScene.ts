import Phaser from 'phaser';
import { ensureRaceTextures, layerKey, obstacleKey } from '../art/RaceArt';
import { obstacleShapes, RACE_PENALTY_MS, raceThemes, type ObstacleKind, type RaceTrack } from '../data/race';
import { tone } from '../systems/tones';
import { button, escapeHTML, type GameUI } from '../ui/GameUI';

export interface RaceResult {
  /** Riding time plus penalties. */
  timeMs: number;
  penaltyMs: number;
  mistakes: number;
}

export interface RaceRecord {
  best: number;
  newBest: boolean;
  reward: string;
}

export interface RaceSession {
  track: RaceTrack;
  ui: GameUI;
  /** First frame of the chosen horse in the `horses` sheet. */
  horseFrame: number;
  /** Right-facing mounted frame in the `riders` sheet. */
  riderFrame: number;
  accessoryKey: string | null;
  best: number | null;
  /** World stores the result and hands back best time and reward for the results panel. */
  record: (result: RaceResult) => RaceRecord;
  onExit: () => void;
}

type Phase = 'intro' | 'countdown' | 'running' | 'finished';

const GROUND_Y = 452;
const HORSE_X = 230;
const SCALE = 1.7;
const CRUISE = 390;
const HIT_SPEED = 150;
const RECOVERY = 280;
const JUMP_SPEED = 830;
const GRAVITY = 2500;
const BUFFER_MS = 140;
const SAFE_MS = 650;
const FADE = { r: 16, g: 44, b: 43 };
const FONT = 'Arial, sans-serif';

/** Side-view horse runner: auto-run, jump, forgiving bumps. Runs any track from src/data/race.ts. */
export class RaceScene extends Phaser.Scene {
  private session!: RaceSession;
  private phase: Phase = 'intro';
  private distance = 0;
  private speed = 0;
  private height = 0;
  private velocity = 0;
  private elapsed = 0;
  private penalty = 0;
  private mistakes = 0;
  private jumpQueuedAt = -Infinity;
  private safeUntil = 0;
  private nextDustAt = 0;
  private paused = false;
  private retry = false;
  private leaving = false;
  private calm = false;
  private obstacles: { kind: ObstacleKind; at: number; image: Phaser.GameObjects.Image; hit: boolean }[] = [];
  private rider!: Phaser.GameObjects.Container;
  private shadow!: Phaser.GameObjects.Ellipse;
  private horse!: Phaser.GameObjects.Image;
  private track!: Phaser.GameObjects.Container;
  private parallax: { sprite: Phaser.GameObjects.TileSprite; factor: number }[] = [];
  private timerText!: Phaser.GameObjects.Text;
  private bumpsText!: Phaser.GameObjects.Text;
  private progressMarker!: Phaser.GameObjects.Container;
  private banner!: Phaser.GameObjects.Text;
  private controlsHint!: Phaser.GameObjects.Text;

  constructor() {
    super('Race');
  }

  init(session: RaceSession): void {
    this.session = session;
    this.phase = 'intro';
    this.distance = 0;
    this.speed = 0;
    this.height = 0;
    this.velocity = 0;
    this.elapsed = 0;
    this.penalty = 0;
    this.mistakes = 0;
    this.jumpQueuedAt = -Infinity;
    this.safeUntil = 0;
    this.paused = false;
    this.retry = false;
    this.leaving = false;
    this.obstacles = [];
    this.parallax = [];
  }

  create(): void {
    const { track } = this.session;
    const theme = raceThemes[track.theme];
    this.calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    ensureRaceTextures(this);

    const [top, bottom] = theme.sky;
    for (let i = 0; i < 8; i++) {
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(top), Phaser.Display.Color.ValueToColor(bottom), 7, i);
      this.add.rectangle(480, i * 42 + 21, 960, 42, Phaser.Display.Color.GetColor(color.r, color.g, color.b));
    }
    // Hill colour fills the band between the rolling hills and the track.
    this.add.rectangle(480, 415, 960, 80, Phaser.Display.Color.ValueToColor(theme.hills).darken(8).color);
    if (theme.moon) {
      this.add.circle(780, 90, 30, 0xf4efd8);
      this.add.image(780, 90, 'environment-glow').setTint(0xf4efd8).setScale(2).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);
      for (let i = 0; i < 40; i++) this.add.rectangle((i * 211) % 960, 10 + (i * 67) % 200, 2, 2, 0xf4efd8, 0.8);
    } else this.add.circle(160, 80, 30, 0xfff4c8, 0.9);
    this.parallax = [
      { sprite: this.add.tileSprite(480, 300, 960, 160, layerKey('hills', track.theme)), factor: 0.12 },
      { sprite: this.add.tileSprite(480, GROUND_Y - 110 + 2, 960, 220, layerKey('trees', track.theme)), factor: 0.4 },
      { sprite: this.add.tileSprite(480, GROUND_Y + 55 - 12, 960, 110, layerKey('ground', track.theme)).setDepth(1), factor: 1 },
    ];

    // Everything on the track scrolls together: start line, obstacles, finish.
    this.track = this.add.container(HORSE_X, 0).setDepth(2);
    this.track.add(this.add.rectangle(0, GROUND_Y - 30, 6, 60, 0xf4efe6));
    for (let x = 300; x < track.length; x += 170 + (x % 90)) {
      this.track.add(this.add.rectangle(x, GROUND_Y - 3, 3, 8 + (x % 7), Phaser.Display.Color.ValueToColor(theme.grass).brighten(18).color));
    }
    for (const { kind, at } of track.obstacles) {
      const image = this.add.image(at, GROUND_Y + 2, obstacleKey(kind)).setOrigin(0.5, 1);
      this.track.add(image);
      this.obstacles.push({ kind, at, image, hit: false });
    }
    const finish = this.add.container(track.length, GROUND_Y);
    for (const x of [-60, 60]) finish.add(this.add.rectangle(x, -60, 8, 120, 0xf4efe6));
    finish.add(this.add.rectangle(0, -112, 128, 26, 0x55cabb).setStrokeStyle(2, 0xf4efe6));
    finish.add(this.add.text(0, -112, 'FINISH', { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#f4efe6' }).setOrigin(0.5));
    for (let i = 0; i < 8; i++) finish.add(this.add.rectangle(-56 + i * 16, -4, 16, 8, i % 2 ? 0x1d1a22 : 0xf4efe6));
    this.track.add(finish);

    const { motes } = theme;
    this.add.particles(0, 0, 'environment-glow', {
      x: { min: 0, max: 960 }, y: motes.drift === 'rise' ? { min: 200, max: 460 } : { min: -10, max: 200 },
      speedX: { min: -120, max: -40 }, speedY: motes.drift === 'rise' ? { min: -30, max: -8 } : { min: 20, max: 60 },
      scale: { start: 0.06, end: 0.02 }, alpha: { start: 0.9, end: 0 }, lifespan: 3200, tint: motes.color,
      frequency: 3200 / motes.count, blendMode: 'ADD',
    }).setDepth(4);

    this.horse = this.add.image(0, 0, 'horses', this.session.horseFrame).setOrigin(0.5, 70 / 80).setScale(SCALE);
    const seat = -19.6 * SCALE;
    const riderParts: Phaser.GameObjects.GameObject[] = [this.horse, this.add.image(0, seat, 'riders', this.session.riderFrame).setOrigin(0.5, 1).setScale(SCALE)];
    if (this.session.accessoryKey) riderParts.push(this.add.image(0, seat, this.session.accessoryKey).setOrigin(0.5, 1).setScale(SCALE));
    this.shadow = this.add.ellipse(HORSE_X, GROUND_Y + 2, 120, 16, 0x000000, 0.22).setDepth(2);
    this.rider = this.add.container(HORSE_X, GROUND_Y, riderParts).setDepth(3);

    this.timerText = this.hud(24, 20, `${track.name}\n0.0s`);
    this.bumpsText = this.hud(936, 20, 'Bumps 0').setOrigin(1, 0);
    this.add.rectangle(480, 34, 364, 14, 0x1d1a22, 0.6).setDepth(10).setStrokeStyle(2, 0xf4efe6);
    this.add.text(672, 34, '⚑', { fontFamily: FONT, fontSize: '20px', color: '#f4efe6' }).setOrigin(0.5).setDepth(10);
    this.progressMarker = this.add.container(300, 34, [this.add.circle(0, 0, 8, 0x55cabb).setStrokeStyle(2, 0xf4efe6)]).setDepth(11);
    this.banner = this.add.text(480, 230, '', {
      fontFamily: 'Georgia, serif', fontSize: '96px', color: '#fff0d1', stroke: '#183b34', strokeThickness: 8, align: 'center',
    }).setOrigin(0.5).setDepth(20);
    this.controlsHint = this.add.text(480, 512, 'Space · W · ↑ · click to jump      Esc to leave', {
      fontFamily: FONT, fontSize: '16px', color: '#fff0d1', backgroundColor: '#120f1ccc', padding: { x: 12, y: 6 },
    }).setOrigin(0.5, 1).setDepth(20);

    const keys = this.input.keyboard?.addKeys({ space: 'SPACE', w: 'W', up: 'UP', esc: 'ESC' }) as Record<'space' | 'w' | 'up' | 'esc', Phaser.Input.Keyboard.Key> | undefined;
    this.input.keyboard?.addCapture('SPACE,UP,W');
    for (const key of [keys?.space, keys?.w, keys?.up]) key?.on('down', () => this.pressJump());
    keys?.esc.on('down', () => { if (this.phase !== 'finished') this.leave(); });
    this.input.on('pointerdown', () => this.pressJump());
    const blur = (): void => { if (this.phase === 'running') this.setPaused(true); };
    this.game.events.on(Phaser.Core.Events.BLUR, blur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(Phaser.Core.Events.BLUR, blur));

    this.cameras.main.fadeIn(500, FADE.r, FADE.g, FADE.b);
    this.intro();
  }

  update(time: number, rawDelta: number): void {
    const delta = Math.min(rawDelta, 50) / 1000;
    if (this.paused) return;
    const moving = this.phase === 'running' || this.phase === 'finished';
    if (moving) {
      if (this.phase === 'running') {
        this.elapsed += delta * 1000;
        this.speed = Math.min(CRUISE, this.speed + (this.speed < HIT_SPEED ? 900 : RECOVERY) * delta);
      } else this.speed = Math.max(0, this.speed - 380 * delta);
      this.distance += this.speed * delta;
      if (time - this.jumpQueuedAt < BUFFER_MS && this.height === 0 && this.phase === 'running') this.jump();
      if (this.height > 0 || this.velocity > 0) {
        this.velocity -= GRAVITY * delta;
        this.height = Math.max(0, this.height + this.velocity * delta);
        if (this.height === 0) { this.velocity = 0; tone(this, 150, 0.06, 'triangle', 0.02); }
      }
      if (this.phase === 'running') this.checkObstacles(time);
      if (this.phase === 'running' && this.distance >= this.session.track.length) this.finish();
    }
    this.track.setX(HORSE_X - this.distance);
    for (const { sprite, factor } of this.parallax) sprite.tilePositionX = this.distance * factor;
    const gallop = this.speed > 30 && this.height === 0 ? Math.floor(this.distance / 34) % 4 : 1;
    this.horse.setFrame(this.session.horseFrame + gallop);
    this.rider.setY(GROUND_Y - this.height + (this.height === 0 && this.speed > 30 ? Math.sin(this.distance / 18) * 1.5 : 0));
    this.rider.setAngle(this.height > 0 ? Phaser.Math.Clamp(-this.velocity / 60, -12, 10) : 0);
    this.shadow.setScale(1 - Math.min(this.height, 140) / 280);
    if (this.height === 0 && this.speed > 120 && time > this.nextDustAt) {
      this.nextDustAt = time + 70;
      const dust = this.add.circle(HORSE_X - 40, GROUND_Y - 4, 4, raceThemes[this.session.track.theme].dirt, 0.6).setDepth(2);
      this.tweens.add({ targets: dust, x: dust.x - 60, y: dust.y - 10, alpha: 0, scale: 2.2, duration: 450, onComplete: () => dust.destroy() });
    }
    if (this.phase === 'running') {
      const progress = Phaser.Math.Clamp(this.distance / this.session.track.length, 0, 1);
      this.progressMarker.setX(300 + progress * 360);
      this.timerText.setText(`${this.session.track.name}\n${((this.elapsed + this.penalty) / 1000).toFixed(1)}s`);
    }
  }

  private hud(x: number, y: number, value: string): Phaser.GameObjects.Text {
    return this.add.text(x, y, value, {
      fontFamily: FONT, fontSize: '18px', color: '#fff0d1', backgroundColor: '#3a2d22e6', padding: { x: 12, y: 8 }, lineSpacing: 4,
    }).setDepth(10);
  }

  private intro(): void {
    const { track } = this.session;
    const title = this.add.text(480, 200, track.name, { fontFamily: 'Georgia, serif', fontSize: '56px', color: '#fff0d1', stroke: '#183b34', strokeThickness: 8 }).setOrigin(0.5).setDepth(20).setAlpha(0);
    const tagline = this.add.text(480, 262, track.tagline, { fontFamily: FONT, fontSize: '18px', color: '#fff0d1', backgroundColor: '#120f1ccc', padding: { x: 12, y: 6 } }).setOrigin(0.5).setDepth(20).setAlpha(0);
    const best = this.session.best === null ? 'No best time yet' : `Best ${(this.session.best / 1000).toFixed(1)}s`;
    const bestText = this.add.text(480, 306, best, { fontFamily: FONT, fontSize: '15px', color: '#bff8ec' }).setOrigin(0.5).setDepth(20).setAlpha(0);
    this.tweens.add({ targets: [title, tagline, bestText], alpha: 1, duration: 400 });
    this.time.delayedCall(1700, () => {
      this.tweens.add({ targets: [title, tagline, bestText], alpha: 0, duration: 300, onComplete: () => { title.destroy(); tagline.destroy(); bestText.destroy(); } });
      this.countdown(3);
    });
  }

  private countdown(count: number): void {
    this.phase = 'countdown';
    const label = count ? String(count) : 'GO!';
    this.banner.setText(label).setScale(1.4).setAlpha(1);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 260, ease: 'Back.Out' });
    tone(this, count ? 440 : 660, 0.18, 'sine', 0.04);
    if (!count) {
      this.phase = 'running';
      this.tweens.add({ targets: this.banner, alpha: 0, duration: 400, delay: 350 });
      this.tweens.add({ targets: this.controlsHint, alpha: 0, duration: 600, delay: 5000 });
      return;
    }
    this.time.delayedCall(700, () => this.countdown(count - 1));
  }

  private pressJump(): void {
    if (this.paused) { this.setPaused(false); return; }
    if (this.phase !== 'running') return;
    this.jumpQueuedAt = this.time.now;
    if (this.height === 0) this.jump();
  }

  private jump(): void {
    this.jumpQueuedAt = -Infinity;
    this.velocity = JUMP_SPEED;
    this.height = 0.01;
    tone(this, 520, 0.1, 'sine', 0.02);
  }

  private checkObstacles(time: number): void {
    const front = this.distance + 38, back = this.distance - 34;
    for (const obstacle of this.obstacles) {
      if (obstacle.hit) continue;
      const shape = obstacleShapes[obstacle.kind];
      const inset = shape.flat ? shape.width * 0.2 : 6;
      const left = obstacle.at - shape.width / 2 + inset, right = obstacle.at + shape.width / 2 - inset;
      if (front < left || back > right) continue;
      const clear = shape.flat ? this.height > 2 : this.height > shape.height - 8;
      if (clear || time < this.safeUntil) continue;
      obstacle.hit = true;
      this.bump(obstacle, time);
    }
  }

  private bump(obstacle: (typeof this.obstacles)[number], time: number): void {
    const shape = obstacleShapes[obstacle.kind];
    this.safeUntil = time + SAFE_MS;
    this.speed = Math.min(this.speed, HIT_SPEED);
    this.penalty += RACE_PENALTY_MS;
    this.mistakes++;
    this.bumpsText.setText(`Bumps ${this.mistakes} · +${(this.penalty / 1000).toFixed(1)}s`);
    tone(this, shape.splash ? 300 : 120, 0.2, shape.splash ? 'sine' : 'triangle', 0.05);
    if (!this.calm) this.cameras.main.shake(120, 0.006);
    this.tweens.add({ targets: this.rider, alpha: 0.4, duration: 90, yoyo: true, repeat: 3 });
    const x = HORSE_X + 30, y = GROUND_Y - 10;
    this.add.particles(x, y, 'environment-glow', {
      speed: { min: 80, max: 220 }, angle: { min: 200, max: 340 }, gravityY: 600, scale: { start: 0.1, end: 0 }, lifespan: 600,
      tint: shape.splash ? 0x9fd6e8 : obstacle.kind === 'hay' ? 0xf0d070 : 0xc8a46e, emitting: false,
    }).setDepth(5).explode(16);
    this.tweens.add({ targets: obstacle.image, angle: obstacle.kind === 'fence' ? 18 : 8, duration: 120, yoyo: true });
    const label = this.add.text(x + 30, y - 70, `+${RACE_PENALTY_MS / 1000}s`, { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#ffb36b', stroke: '#1d1a22', strokeThickness: 4 }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: label, y: label.y - 40, alpha: 0, duration: 900, onComplete: () => label.destroy() });
    const oops = ['Oops!', 'Bonk!', 'Splash!', 'Whoa there!'][shape.splash ? 2 : this.mistakes % 2 ? 0 : 1]!;
    const bubble = this.add.text(HORSE_X, GROUND_Y - 170, oops, { fontFamily: FONT, fontSize: '16px', color: '#1d1a22', backgroundColor: '#f4efe6', padding: { x: 8, y: 4 } }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: bubble, alpha: 0, delay: 500, duration: 300, onComplete: () => bubble.destroy() });
  }

  private finish(): void {
    this.phase = 'finished';
    this.progressMarker.setX(660);
    const timeMs = Math.round(this.elapsed + this.penalty);
    this.timerText.setText(`${this.session.track.name}\n${(timeMs / 1000).toFixed(1)}s`);
    [523, 659, 784, 1047].forEach((frequency, i) => this.time.delayedCall(i * 110, () => tone(this, frequency, 0.25, 'sine', 0.035)));
    const confetti = this.add.particles(HORSE_X + 60, GROUND_Y - 160, 'environment-glow', {
      speed: { min: 120, max: 320 }, angle: { min: 200, max: 340 }, gravityY: 400, scale: { start: 0.1, end: 0.04 }, lifespan: 1400,
      tint: [0x55cabb, 0xffd86a, 0xff9ab8, 0xf4efe6], emitting: false,
    }).setDepth(15);
    confetti.explode(this.calm ? 20 : 60);
    this.banner.setText('Finish!').setFontSize(72).setAlpha(1).setScale(1.3);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 300, ease: 'Back.Out' });
    const result: RaceResult = { timeMs, penaltyMs: this.penalty, mistakes: this.mistakes };
    this.time.delayedCall(1100, () => this.results(result, this.session.record(result)));
  }

  private results(result: RaceResult, record: RaceRecord): void {
    const { track, ui } = this.session;
    this.banner.setAlpha(0);
    this.session = { ...this.session, best: record.best };
    const seconds = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;
    const rows = [
      ['Riding time', seconds(result.timeMs - result.penaltyMs)],
      ['Bumps', result.mistakes ? `${result.mistakes} · +${seconds(result.penaltyMs)}` : 'None. Clean round!'],
      ['Best', `${seconds(record.best)}${record.newBest ? ' · New best ★' : ''}`],
      ['Reward', `${record.reward} ×1`],
    ].map(([term, value]) => `<div><dt>${term}</dt><dd>${escapeHTML(value!)}</dd></div>`).join('');
    ui.show(`${track.name} · Finished!`, `<div class="result-time">${(result.timeMs / 1000).toFixed(1)}<small> seconds</small></div><dl class="race-stats">${rows}</dl>${button('race-again', 'Race again')} ${button('race-leave', 'Back to Sunmeadow')}`,
      () => { if (this.retry) this.scene.restart(this.session); else this.leave(); }, 'race-results');
    ui.bind('race-again', () => { this.retry = true; ui.close(); });
    ui.bind('race-leave', () => ui.close());
    ui.dialog.querySelector<HTMLButtonElement>('#race-again')?.focus();
  }

  private setPaused(paused: boolean): void {
    this.paused = paused;
    this.banner.setText(paused ? 'Paused' : '').setFontSize(paused ? 56 : 96).setAlpha(paused ? 1 : 0).setScale(1);
    this.controlsHint.setText(paused ? 'Press Space or click to keep riding' : this.controlsHint.text).setAlpha(paused ? 1 : 0);
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.phase = 'finished';
    this.paused = true;
    this.cameras.main.fadeOut(400, FADE.r, FADE.g, FADE.b);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.session.onExit();
      this.scene.stop();
    });
  }
}
