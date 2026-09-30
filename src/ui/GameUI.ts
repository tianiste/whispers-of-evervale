export type MenuPage = 'pause' | 'inventory' | 'wardrobe' | 'horse' | 'journal';

/** Native dialog owns focus; WorldScene owns all game state. */
export class GameUI {
  readonly root = document.createElement('div');
  readonly dialog = document.createElement('dialog');
  private readonly quest = document.createElement('div');
  private readonly prompt = document.createElement('div');
  private readonly toast = document.createElement('div');
  private toastTimer = 0;
  private onClose: (() => void) | undefined;
  private opener: HTMLElement | null = null;

  constructor(private readonly openMenu: (page: MenuPage) => void, private readonly resetKeys: () => void, readonly sound: (name: string) => void = () => {}) {
    this.root.className = 'game-ui';
    this.quest.className = 'objective hud-panel';
    this.prompt.className = 'interaction hud-panel';
    this.toast.className = 'reward-toast';
    this.toast.setAttribute('role', 'status');
    this.quest.setAttribute('aria-live', 'polite');
    const menu = document.createElement('button');
    menu.className = 'menu-toggle';
    menu.textContent = 'Menu · Esc';
    menu.onclick = () => openMenu('pause');
    this.root.append(this.quest, this.prompt, menu, this.toast);
    this.dialog.className = 'game-dialog';
    this.dialog.setAttribute('aria-labelledby', 'window-title');
    this.dialog.addEventListener('cancel', (event) => { event.preventDefault(); this.close(); });
    // Stop game keys at the dialog; retain native Tab, Enter, Space and Escape behavior.
    this.dialog.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key !== 'Tab') return;
      const controls = this.dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)');
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    });
    this.dialog.addEventListener('keyup', (event) => event.stopPropagation());
    this.dialog.addEventListener('pointerover', event => {
      const button = event.target instanceof Element ? event.target.closest('button') : null;
      if (button && !button.disabled && !(event.relatedTarget instanceof Node && button.contains(event.relatedTarget))) this.sound('ui-hover');
    });
    document.body.append(this.root, this.dialog);
    window.addEventListener('keydown', this.handleShortcut);
    this.setPrompt('');
  }

  get isOpen(): boolean { return this.dialog.open; }

  show(title: string, content: string, onClose?: () => void, kind = ''): void {
    const focused = this.dialog.contains(document.activeElement) ? (document.activeElement as HTMLElement).id : '';
    if (!this.isOpen) this.sound('ui-select');
    if (!this.isOpen) this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.onClose = onClose;
    this.dialog.className = `game-dialog ${kind}`;
    this.dialog.innerHTML = `<header><div><small>WHISPERS OF EVERVALE</small><h1 id="window-title">${escapeHTML(title)}</h1></div><button id="close-window" aria-label="Close window">Close · Esc</button></header><div class="window-content">${content}</div>`;
    this.dialog.querySelector<HTMLButtonElement>('#close-window')!.onclick = () => this.close();
    this.resetKeys();
    if (!this.isOpen) this.dialog.showModal();
    (focused ? this.dialog.querySelector<HTMLElement>(`#${focused}`) : null)?.focus();
    this.root.classList.add('modal-open');
  }

  close(): void {
    if (!this.isOpen) return;
    this.sound('ui-back');
    this.dialog.close();
    this.root.classList.remove('modal-open');
    this.resetKeys();
    const callback = this.onClose;
    this.onClose = undefined;
    callback?.();
    this.opener?.focus();
    // A focused HUD button must not consume Space intended for the game.
    if (this.opener?.classList.contains('menu-toggle')) this.opener.blur();
  }

  /** Closes the dialog without its close callback, e.g. while a canvas minigame takes over. */
  dismiss(): void {
    this.onClose = undefined;
    this.close();
  }

  /** Hides world HUD chrome while another scene (Echo, race, grooming) owns the screen. */
  setHudHidden(hidden: boolean): void { this.root.classList.toggle('hud-hidden', hidden); }

  bind(id: string, action: () => void): void {
    const button = this.dialog.querySelector<HTMLButtonElement>(`#${id}`);
    if (button) button.onclick = () => { this.sound(/^(equip|wear|place|parade-outfit|parade-accessory)-/.test(id) ? 'confirm' : /back|leave|cancel/.test(id) ? 'ui-back' : 'ui-select'); action(); };
  }

  setQuest(text: string): void { if (this.quest.textContent !== text) this.quest.textContent = text; }
  setPrompt(text: string): void { this.prompt.textContent = text; this.prompt.hidden = !text; }
  notify(text: string): void {
    if (this.isOpen) {
      let feedback = this.dialog.querySelector<HTMLElement>('.inline-feedback');
      if (!feedback) {
        feedback = document.createElement('p');
        feedback.className = 'inline-feedback';
        feedback.setAttribute('role', 'status');
        this.dialog.querySelector('.window-content')!.append(feedback);
      }
      feedback.textContent = text;
    }
    this.toast.textContent = text;
    this.toast.classList.add('visible');
    window.clearTimeout(this.toastTimer);
    // Long toasts stay up long enough to read.
    this.toastTimer = window.setTimeout(() => this.toast.classList.remove('visible'), Math.max(3800, text.length * 60));
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleShortcut);
    window.clearTimeout(this.toastTimer);
    this.dialog.remove();
    this.root.remove();
  }


  private handleShortcut = (event: KeyboardEvent): void => {
    if (this.isOpen || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    const pages: Record<string, MenuPage> = { Escape: 'pause', i: 'inventory', o: 'wardrobe', h: 'horse', j: 'journal' };
    const page = pages[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (page) { event.preventDefault(); this.openMenu(page); }
  };
}

export function escapeHTML(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export function button(id: string, label: string, selected = false): string {
  return `<button id="${id}"${selected ? ' aria-pressed="true"' : ''}>${label}</button>`;
}

export function color(value: number): string { return `#${value.toString(16).padStart(6, '0')}`; }
