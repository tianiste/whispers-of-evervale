import { birthdayCard, birthdayGifts } from '../data/birthdayGift';
import { escapeHTML } from './GameUI';

/** The birthday card, shared by the Echo VI finale and the journal. */
export function birthdayCardHTML(): string {
  return `<div class="birthday-card"><small>${escapeHTML(birthdayCard.caption)}</small><h2>${escapeHTML(birthdayCard.heading)}</h2><p class="birthday-message">${escapeHTML(birthdayCard.message)}</p><p class="birthday-signature">${escapeHTML(birthdayCard.signature)}</p></div>`;
}

export function birthdayGiftsHTML(restored: number, total: number): string {
  return `<p class="echo-line">${escapeHTML(birthdayGifts.intro)}</p><ul class="birthday-gifts">${birthdayGifts.items.map(gift => `<li>${escapeHTML(gift)}</li>`).join('')}</ul><p class="echo-reward">Echoes restored · ${restored} of ${total}</p>`;
}
