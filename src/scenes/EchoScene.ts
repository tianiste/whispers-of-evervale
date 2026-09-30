import Phaser from 'phaser';
import { atmosphere, cue, duck } from '../systems/audio';
import { createEchoStage, type EchoStage, type StageContext } from '../art/EchoStages';
import { birthdayReveal } from '../data/birthdayGift';
import { echoTotal, type EchoDefinition, type EchoStep, type PlayStep, type ReconstructStep } from '../data/echoes';
import { items } from '../data/items';
import { minigames } from '../minigames';
import type { MinigameHandle } from '../minigames/Minigame';
import { reconstruct } from '../minigames/Reconstruct';
import { birthdayCardHTML, birthdayGiftsHTML } from '../ui/BirthdayCard';
import { EchoPanel } from '../ui/EchoPanel';
import type { GameUI } from '../ui/GameUI';

export interface EchoSession {
  echo: EchoDefinition;
  ui: GameUI;
  solvedSteps: readonly string[];
  restoredBefore: number;
  /** The player's horse, for stages and games that show it. */
  horse: StageContext;
  onStep: (stepId: string) => void;
  /** Called after the fade-out; `restored` is false when the player stepped out early. */
  onFinish: (restored: boolean) => void;
}

const FADE = { r: 10, g: 12, b: 24 };

/** Runs one Echo over the paused world: setup, steps, completion, return. World owns all saved state. */
export class EchoScene extends Phaser.Scene {
  private session!: EchoSession;
  private stage!: EchoStage;
  private panel!: EchoPanel;
  private hint!: Phaser.GameObjects.Text;
  private activeGame: MinigameHandle | null = null;
  private calm = false;
  private solved = new Set<string>();
  private restored = false;
  private finishing = false;
  /** Canvas-only moments (the prelude, the finale's held lines): no panel is open, so Escape steps out. */
  private canvasOnly = false;

  constructor() {
    super('Echo');
  }

  init(session: EchoSession): void {
    this.session = session;
    this.solved = new Set(session.solvedSteps);
    this.restored = false;
    this.finishing = false;
    this.canvasOnly = false;
    this.activeGame = null;
  }

  create(): void {
    const { echo, ui } = this.session;
    this.calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    atmosphere(this, echo.setting);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => duck(this, 1));
    this.stage = createEchoStage(this, echo.setting, this.calm, this.session.horse);
    for (const step of echo.steps) if (this.solved.has(step.id)) this.replay(step);
    this.add.text(24, 16, `ECHO ${echo.numeral}`, {
      fontFamily: 'Georgia, serif', fontSize: '13px', color: '#bff8ec', letterSpacing: 4, backgroundColor: '#0a0c18aa', padding: { x: 6, y: 2 },
    }).setDepth(100);
    const title = this.add.text(24, 36, echo.title, {
      fontFamily: 'Georgia, serif', fontSize: '24px', color: '#fff0d1', backgroundColor: '#0a0c18aa', padding: { x: 6, y: 2 },
    }).setDepth(100).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 900 });
    if (echo.memoryDate) {
      this.add.text(24, 74, echo.memoryDate, {
        fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#9fe8da', letterSpacing: 2, backgroundColor: '#0a0c18aa', padding: { x: 6, y: 2 },
      }).setDepth(100);
    }
    this.hint = this.add.text(480, 518, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#fff0d1', backgroundColor: '#120f1ce6', padding: { x: 12, y: 6 },
    }).setOrigin(0.5, 1).setDepth(100).setVisible(false);
    // Minigames close the panel, so Escape reaches the canvas; it steps out like the panel's Close.
    this.input.keyboard?.on('keydown-ESC', () => { if (this.activeGame || this.canvasOnly) this.finish(); });
    this.panel = new EchoPanel(ui, `Echo ${echo.numeral} · ${echo.title}`, () => this.finish());
    this.cameras.main.fadeIn(700, FADE.r, FADE.g, FADE.b);
    this.time.delayedCall(700, () => {
      if (this.solved.size) this.panel.story(['The Echo picks up where you left off.'], 'Continue', () => this.next());
      else if (echo.prelude) this.hold(echo.prelude, { from: 1, dim: 1, stack: false }, () => this.panel.story(echo.intro, 'Remember', () => this.next()));
      else this.panel.story(echo.intro, 'Remember', () => this.next());
    });
  }

  private replay(step: EchoStep): void {
    const cues = step.kind === 'quiz' ? [step.cue] : step.kind === 'match' ? step.pairs.map(pair => pair.cue) : [step.backdrop, step.cue];
    for (const cue of cues) if (cue) this.stage.cue(cue, true);
  }

  private next(): void {
    const step = this.session.echo.steps.find(candidate => !this.solved.has(candidate.id));
    if (!step) { this.complete(); return; }
    if (step.kind === 'quiz') {
      this.panel.quiz(step, option => {
        if (step.cue) this.stage.cue(step.cue, false);
        if (step.open && !option.response) { this.record(step); this.next(); return; }
        this.solve(step, option.response ?? 'Yes. That is how it happened.');
      });
    } else if (step.kind === 'match') {
      this.panel.match(step, index => {
        const cue = step.pairs[index]?.cue;
        if (cue) this.stage.cue(cue, false);
      }, () => this.solve(step, step.solved));
    } else this.play(step);
  }

  /** Canvas steps: intro in the panel, then the panel steps aside while the minigame runs. */
  private play(step: ReconstructStep | PlayStep): void {
    if (step.backdrop) this.stage.cue(step.backdrop, false);
    this.panel.story([step.intro], 'Start', () => {
      this.session.ui.dismiss();
      const start = step.kind === 'reconstruct' ? reconstruct(step) : minigames[step.game];
      let won = false;
      this.activeGame = start({
        scene: this,
        calm: this.calm,
        hint: (text) => this.hint.setText(text).setVisible(Boolean(text)),
        say: (text) => this.session.ui.notify(text),
        cue: (name) => this.stage.cue(name, false),
        horseName: this.session.horse.horseName,
        done: () => {
          if (won || this.finishing) return;
          won = true;
          this.activeGame?.destroy();
          this.activeGame = null;
          this.hint.setVisible(false);
          if (step.cue) this.stage.cue(step.cue, false);
          this.solve(step, step.solved);
        },
      });
    });
  }

  private solve(step: EchoStep, response: string): void {
    cue(this, 'confirm', 0.55);
    this.record(step);
    this.panel.story([response], 'Continue', () => this.next());
  }

  private record(step: EchoStep): void {
    this.solved.add(step.id);
    this.session.onStep(step.id);
  }

  private complete(): void {
    const { echo, ui, restoredBefore } = this.session;
    this.restored = true;
    if (echo.finale) { this.finale(); return; }
    cue(this, 'reveal', 0.7);
    const reward = items.find(item => item.id === echo.reward)?.name ?? echo.reward;
    this.panel.complete(echo.completion, reward, restoredBefore + 1, echoTotal, () => ui.close());
  }

  /**
   * Echo VI: the last lines are held on the canvas, then a pause, the realization, the birthday card
   * and finally the gifts. Each beat waits for the player; nothing is thrown on screen at once.
   */
  private finale(): void {
    const { echo, ui, restoredBefore } = this.session;
    ui.dismiss();
    duck(this, 0.35);
    this.hold(echo.completion, { from: 0, dim: 0.55, stack: true }, () => {
      atmosphere(this, 'finale');
      duck(this, 0.7);
      cue(this, 'reveal', 0.6);
      this.panel.story(birthdayReveal, 'Continue', () => {
        ui.dismiss();
        this.canvasOnly = true;
        duck(this, 1);
        this.stage.cue('birthday', false);
        this.time.delayedCall(2400, () => {
          this.canvasOnly = false;
          cue(this, 'card', 0.6);
          this.panel.page(birthdayCardHTML(), 'Open your gifts', () => {
            cue(this, 'reward', 0.65);
            this.panel.page(birthdayGiftsHTML(restoredBefore + 1, echoTotal), 'Return to Evervale', () => ui.close(), 'birthday');
          }, 'birthday');
        });
      });
    });
  }

  /**
   * Holds lines on the darkened canvas: one after another, or stacked so the last stays with the first.
   * Clicks do not skip them; these are the pauses. Escape still steps out.
   */
  private hold(lines: readonly string[], options: { from: number; dim: number; stack: boolean }, onDone: () => void): void {
    this.canvasOnly = true;
    const dim = this.add.rectangle(480, 270, 960, 540, 0x05060c).setAlpha(options.from).setDepth(90);
    this.tweens.add({ targets: dim, alpha: options.dim, duration: 700 });
    const shown: Phaser.GameObjects.Text[] = [];
    let at = 700;
    lines.forEach((line, index) => {
      const date = line === this.session.echo.memoryDate;
      const y = options.stack ? 270 + (index - (lines.length - 1) / 2) * 56 : 270;
      const text = this.add.text(480, y, line, date
        ? { fontFamily: '"Courier New", monospace', fontSize: '22px', color: '#9fe8da', letterSpacing: 4 }
        : { fontFamily: 'Georgia, serif', fontSize: '30px', color: '#fff0d1', align: 'center', wordWrap: { width: 800 }, shadow: { offsetX: 0, offsetY: 2, color: '#05060c', blur: 8, fill: true } }).setOrigin(0.5).setDepth(91).setAlpha(0);
      shown.push(text);
      const last = index === lines.length - 1;
      this.time.delayedCall(at, () => {
        if (date && !this.calm) this.tweens.add({ targets: text, alpha: { from: 0.2, to: 1 }, duration: 110, yoyo: true, repeat: 4, onComplete: () => text.setAlpha(1) });
        else this.tweens.add({ targets: text, alpha: 1, duration: 900 });
      });
      at += 900 + (last ? 2800 : 2000);
      if (!options.stack && !last) {
        this.time.delayedCall(at, () => this.tweens.add({ targets: text, alpha: 0, duration: 500 }));
        at += 600;
      }
    });
    this.time.delayedCall(at, () => this.tweens.add({ targets: [dim, ...shown], alpha: 0, duration: 900, onComplete: () => { dim.destroy(); shown.forEach(text => text.destroy()); } }));
    this.time.delayedCall(at + 900 + (options.stack ? 1200 : 200), () => { this.canvasOnly = false; onDone(); });
  }

  /** Dialog closed or Escape during a minigame: either returning after completion or stepping out early. */
  private finish(): void {
    if (this.finishing) return;
    this.finishing = true;
    duck(this, 1);
    this.cameras.main.fadeOut(450, FADE.r, FADE.g, FADE.b);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.activeGame?.destroy();
      this.activeGame = null;
      this.session.onFinish(this.restored);
      this.scene.stop();
    });
  }
}
