import { cleanHorseName, horses, HORSE_NAME_MAX, type HorseDefinition, type HorseId } from '../data/horses';
import { button, escapeHTML, type GameUI } from './GameUI';

/** Meet Your Horse: three cards, the Quarter Horse first with its suggested name pre-filled. */
export function showHorseChoice(ui: GameUI, onChoose: (id: HorseId, name: string) => void): void {
  let selected: HorseDefinition = horses[0]!;
  let name = selected.name;
  const render = (): void => {
    const cards = horses.map((horse, index) => `<button class="horse-card" id="horse-${horse.id}" aria-pressed="${horse.id === selected.id}">
      <img src="/assets/art/horse-${horse.id}.png" alt=""><strong>${escapeHTML(horse.breed)}</strong>
      <small>${escapeHTML(horse.coat)}${index === 0 ? ' · Suggested' : ''}</small><span>${escapeHTML(horse.blurb)}</span></button>`).join('');
    ui.show('Meet your horse', `<p>Three horses, one very important decision. Choose your companion, then give them a name.</p>
      <div class="horse-cards">${cards}</div>
      <label class="horse-name">Name <input id="horse-name-input" maxlength="${HORSE_NAME_MAX}" autocomplete="off" spellcheck="false" value="${escapeHTML(name)}"></label>
      ${button('confirm-horse', '')}`, undefined, 'horse-choice');
    const input = ui.dialog.querySelector<HTMLInputElement>('#horse-name-input')!;
    const confirm = ui.dialog.querySelector<HTMLButtonElement>('#confirm-horse')!;
    const finalName = (): string => cleanHorseName(input.value) || selected.name;
    const label = (): void => { confirm.textContent = `Choose ${finalName()}`; };
    label();
    input.oninput = () => { name = input.value; label(); };
    input.onkeydown = (event) => { if (event.key === 'Enter') confirm.click(); };
    confirm.onclick = () => onChoose(selected.id, finalName());
    for (const horse of horses) ui.bind(`horse-${horse.id}`, () => {
      // Keep a custom name; swap only the untouched suggestion.
      if (!cleanHorseName(name) || cleanHorseName(name) === selected.name) name = horse.name;
      selected = horse;
      render();
    });
  };
  render();
  ui.dialog.querySelector<HTMLButtonElement>(`#horse-${selected.id}`)?.focus();
}
