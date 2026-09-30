import { wrongAnswerLines, type EchoOption, type MatchStep, type QuizStep } from '../data/echoes';
import { button, escapeHTML, type GameUI } from './GameUI';

/** Echo narration and puzzles in the shared dialog, docked low so the memory stays visible. */
export class EchoPanel {
  private misses = 0;

  constructor(private readonly ui: GameUI, private readonly title: string, private readonly onClose: () => void) {}

  story(lines: readonly string[], action: string, onContinue: () => void, extra = ''): void {
    this.show(`${lines.map(line => `<p class="echo-line">${escapeHTML(line)}</p>`).join('')}${extra}${button('echo-continue', escapeHTML(action))}`);
    this.ui.bind('echo-continue', onContinue);
    this.focus();
  }

  /** Arbitrary panel content with one action button; `kind` adds a dialog class, e.g. for the birthday card. */
  page(content: string, action: string, onContinue: () => void, kind = ''): void {
    this.show(`${content}${button('echo-continue', escapeHTML(action))}`, kind);
    this.ui.bind('echo-continue', onContinue);
    this.focus();
  }

  quiz(step: QuizStep, onSolved: (option: EchoOption) => void): void {
    const tried = new Set<number>();
    const render = (): void => {
      this.show(`<p class="echo-question">${escapeHTML(step.question)}</p><div class="echo-options">${step.options.map((option, index) =>
        `<button id="echo-option-${index}" class="${tried.has(index) ? 'tried' : ''}">${escapeHTML(option.text)}</button>`).join('')}</div>`);
      step.options.forEach((option, index) => this.ui.bind(`echo-option-${index}`, () => {
        if (option.correct || step.open) { onSolved(option); return; }
        this.ui.sound('error');
        tried.add(index);
        render();
        this.ui.notify(option.response ?? this.miss(wrongAnswerLines));
      }));
      this.focus();
    };
    render();
  }

  match(step: MatchStep, onPair: (index: number) => void, onSolved: () => void): void {
    const matched = new Set<number>();
    const rights = step.pairs.map((_, index) => index).sort((a, b) => step.pairs[a]!.right.localeCompare(step.pairs[b]!.right));
    let left: number | null = null;
    let right: number | null = null;
    const choose = (side: 'left' | 'right', index: number): void => {
      if (side === 'left') left = index; else right = index;
      if (left === null || right === null) { render(); return; }
      const hit = left === right;
      this.ui.sound(hit ? 'shimmer' : 'error');
      if (hit) { matched.add(left); onPair(left); }
      left = right = null;
      if (matched.size === step.pairs.length) { onSolved(); return; }
      render();
      this.ui.notify(hit ? 'The pieces click together.' : this.miss(step.misses));
    };
    const column = (side: 'left' | 'right', order: readonly number[]): string => order.map(index => {
      const pair = step.pairs[index]!;
      const done = matched.has(index);
      const pressed = (side === 'left' ? left : right) === index;
      return `<button id="echo-${side}-${index}" class="${done ? 'matched' : ''}"${done ? ' disabled' : ''} aria-pressed="${pressed}">${done ? '✓ ' : ''}${escapeHTML(side === 'left' ? pair.left : pair.right)}</button>`;
    }).join('');
    const render = (): void => {
      this.show(`<p class="echo-question">${escapeHTML(step.prompt)} <span class="muted">Pick one from each row.</span></p><div class="echo-match"><div>${column('left', step.pairs.map((_, index) => index))}</div><div>${column('right', rights)}</div></div>`);
      step.pairs.forEach((_, index) => {
        this.ui.bind(`echo-left-${index}`, () => choose('left', index));
        this.ui.bind(`echo-right-${index}`, () => choose('right', index));
      });
      this.focus();
    };
    render();
  }

  complete(lines: readonly string[], reward: string, restored: number, total: number, onReturn: () => void): void {
    this.story(lines, 'Return to Evervale', onReturn,
      `<p class="echo-reward">Keepsake · ${escapeHTML(reward)}<br><small>Echoes restored · ${restored} of ${total}</small></p>`);
  }

  private miss(lines: readonly string[]): string {
    return lines[this.misses++ % lines.length]!;
  }

  private show(content: string, kind = ''): void {
    this.ui.show(this.title, content, this.onClose, `echo-panel ${kind}`.trim());
  }

  /** Keep keyboard focus inside the panel when the focused button was replaced or disabled. */
  private focus(): void {
    const active = document.activeElement;
    if (active instanceof HTMLButtonElement && this.ui.dialog.contains(active) && !active.disabled && active.id !== 'close-window') return;
    this.ui.dialog.querySelector<HTMLButtonElement>('.window-content button:not(:disabled)')?.focus();
  }
}
