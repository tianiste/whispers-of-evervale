import type { DialogueDefinition } from './dialogue';

export const birthdayGift = {
  recipient: 'Hana',
  nickname: '',
  message: 'Vse najboljše, draga. Rad te imam in želim ti res lep dan.',
  developerName: 'Tian',
} as const;

export const birthdayFinale: DialogueDefinition = {
  speaker: `Za ${birthdayGift.nickname || birthdayGift.recipient}`,
  message: `The Echo was made for you, ${birthdayGift.recipient}. Horses, cats, countryside — the clues were not terribly subtle, were they?\n\n${birthdayGift.message}\n\n— ${birthdayGift.developerName}\n\nYour birthday teal outfit, bridle ribbon and Echo lantern are ready. Evervale is yours to wander.`,
};
