import Phaser from 'phaser';
import { createEchoStage, type EchoStage } from '../art/EchoStages';
import { echoTotal, type EchoDefinition, type EchoStep } from '../data/echoes';
import { items } from '../data/items';
import { EchoPanel } from '../ui/EchoPanel';
import type { GameUI } from '../ui/GameUI';

export interface EchoSession {
  echo: EchoDefinition;
  ui: GameUI;
  solvedSteps: readonly string[];
  restoredBefore: number;
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
  private solved = new Set<string>();
  private restored = false;
  private finishing = false;

  constructor() {
    super('Echo');
  }

  init(session: EchoSession): void {
    this.session = session;
    this.solved = new Set(session.solvedSteps);
    this.restored = false;
    this.finishing = false;
  }

  create(): void {
    const { echo, ui } = this.session;
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.stage = createEchoStage(this, echo.setting, calm);
    for (const step of echo.steps) if (this.solved.has(step.id)) this.replay(step);
    this.add.text(24, 16, `ECHO ${echo.numeral}`, {
      fontFamily: 'Georgia, serif', fontSize: '13px', color: '#bff8ec', letterSpacing: 4, backgroundColor: '#0a0c18aa', padding: { x: 6, y: 2 },
    }).setDepth(100);
    const title = this.add.text(24, 36, echo.title, {
      fontFamily: 'Georgia, serif', fontSize: '24px', color: '#fff0d1', backgroundColor: '#0a0c18aa', padding: { x: 6, y: 2 },
    }).setDepth(100).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 900 });
    this.panel = new EchoPanel(ui, `Echo ${echo.numeral} · ${echo.title}`, () => this.finish());
    this.cameras.main.fadeIn(700, FADE.r, FADE.g, FADE.b);
    this.time.delayedCall(700, () => {
      if (this.solved.size) this.panel.story(['The Echo picks up where you left off.'], 'Continue', () => this.next());
      else this.panel.story(echo.intro, 'Remember', () => this.next());
    });
  }

  private replay(step: EchoStep): void {
    const cues = step.kind === 'quiz' ? [step.cue] : step.pairs.map(pair => pair.cue);
    for (const cue of cues) if (cue) this.stage.cue(cue, true);
  }

  private next(): void {
    const step = this.session.echo.steps.find(candidate => !this.solved.has(candidate.id));
    if (!step) { this.complete(); return; }
    if (step.kind === 'quiz') {
      this.panel.quiz(step, option => {
        if (step.cue) this.stage.cue(step.cue, false);
        this.solve(step, option.response ?? 'Yes. That is how it happened.');
      });
    } else {
      this.panel.match(step, index => {
        const cue = step.pairs[index]?.cue;
        if (cue) this.stage.cue(cue, false);
      }, () => this.solve(step, step.solved));
    }
  }

  private solve(step: EchoStep, response: string): void {
    this.solved.add(step.id);
    this.session.onStep(step.id);
    this.panel.story([response], 'Continue', () => this.next());
  }

  private complete(): void {
    const { echo, ui, restoredBefore } = this.session;
    this.restored = true;
    const reward = items.find(item => item.id === echo.reward)?.name ?? echo.reward;
    this.panel.complete(echo.completion, reward, restoredBefore + 1, echoTotal, () => ui.close());
  }

  /** Dialog closed: either returning after completion or stepping out early (Escape). */
  private finish(): void {
    if (this.finishing) return;
    this.finishing = true;
    this.cameras.main.fadeOut(450, FADE.r, FADE.g, FADE.b);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.session.onFinish(this.restored);
      this.scene.stop();
    });
  }
}
