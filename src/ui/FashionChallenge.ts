import { accessories, outfitTags, styleParade, tagLabels, type AccessoryId, type StyleTag } from '../data/fashion';
import { outfits, type OutfitId } from '../data/outfits';
import { button, escapeHTML, type GameUI } from './GameUI';

export interface ParadeHost {
  /** Round IDs already passed, in order. */
  roundsDone(): readonly string[];
  look(): { outfitId: OutfitId; accessoryId: AccessoryId };
  owned(): { outfits: readonly OutfitId[]; accessories: readonly AccessoryId[] };
  /** HTML for the rider preview in the current look. */
  preview(): string;
  equip(piece: { outfitId: OutfitId } | { accessoryId: AccessoryId }): void;
  /** Records a passed round; after the last one the world completes the quest and gives the reward. */
  pass(roundId: string): void;
}

const chips = (tags: readonly StyleTag[]): string => tags.map(tag => `<span class="tag">${tagLabels[tag]}</span>`).join('');

/** The Style Parade: three themes, and any equipped piece carrying the theme's tag passes. */
export function showStyleParade(ui: GameUI, host: ParadeHost): void {
  const rounds = styleParade.rounds;
  let introduced = host.roundsDone().length > 0;
  let misses = 0;

  const render = (): void => {
    const round = rounds[host.roundsDone().length];
    if (!round) return;
    const look = host.look();
    const { outfits: ownedOutfits, accessories: ownedAccessories } = host.owned();
    const outfitChoices = outfits.filter(({ id }) => ownedOutfits.includes(id)).map(({ id, name }) =>
      `<button id="parade-outfit-${id}" class="look-choice" aria-pressed="${look.outfitId === id}"><span>${escapeHTML(name)}</span><span class="tags">${chips(outfitTags[id])}</span></button>`).join('');
    const accessoryChoices = accessories.filter(({ id }) => ownedAccessories.includes(id)).map(({ id, name, tags }) =>
      `<button id="parade-accessory-${id}" class="look-choice" aria-pressed="${look.accessoryId === id}"><span>${escapeHTML(name)}</span><span class="tags">${chips(tags)}</span></button>`).join('');
    const intro = introduced ? '' : `<p class="parade-intro"><strong>${styleParade.judge}:</strong> ${escapeHTML(styleParade.intro)}</p>`;
    introduced = true;
    ui.show('Sunmeadow Style Parade', `${intro}<div class="theme-card"><small>ROUND ${host.roundsDone().length + 1} OF ${rounds.length}</small><h2>${escapeHTML(round.theme)}</h2><p>${escapeHTML(round.hint)} <span class="muted">Anything tagged ${tagLabels[round.tag]} counts.</span></p></div>
      <div class="parade-look"><div class="preview">${host.preview()}</div><div><h3>Outfit</h3><div class="look-grid">${outfitChoices}</div><h3>Accessory</h3><div class="look-grid">${accessoryChoices}</div></div></div>
      ${button('parade-walk', 'Walk the runway')}`, undefined, 'parade');
    for (const id of ownedOutfits) ui.bind(`parade-outfit-${id}`, () => { host.equip({ outfitId: id }); render(); });
    for (const id of ownedAccessories) ui.bind(`parade-accessory-${id}`, () => { host.equip({ accessoryId: id }); render(); });
    ui.bind('parade-walk', () => {
      const current = host.look();
      const tags = new Set<StyleTag>([...outfitTags[current.outfitId], ...(accessories.find(({ id }) => id === current.accessoryId)?.tags ?? [])]);
      if (!tags.has(round.tag)) { ui.notify(styleParade.misses[misses++ % styleParade.misses.length]!); return; }
      host.pass(round.id);
      const last = host.roundsDone().length >= rounds.length || !rounds[host.roundsDone().length];
      ui.show('Sunmeadow Style Parade', `<div class="theme-card passed"><small>${escapeHTML(round.theme.toUpperCase())}</small><h2>★ ★ ★</h2><p><strong>${styleParade.judge}:</strong> ${escapeHTML(round.pass)}</p></div>
        ${last ? `<p>${escapeHTML(styleParade.finale)}</p><p class="echo-reward">Reward · Flower crown <small>O → Accessories</small></p>${button('parade-done', 'Take a bow')}` : button('parade-next', 'Next theme')}`, undefined, 'parade');
      ui.bind('parade-next', render);
      ui.bind('parade-done', () => ui.close());
      ui.dialog.querySelector<HTMLButtonElement>('#parade-next, #parade-done')?.focus();
    });
    ui.dialog.querySelector<HTMLButtonElement>('#parade-walk')?.focus();
  };
  render();
}
