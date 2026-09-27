import type { DialogueDefinition } from './dialogue';

export const birthdayGift = {
  recipient: 'Hana',
  nickname: '',
  message: 'Vse najboljše, draga. Rad te imam in želim ti res lep dan.',
  developerName: 'Tian',
} as const;

export const birthdayFinale: DialogueDefinition = {
  speaker: `Za ${birthdayGift.nickname || birthdayGift.recipient}`,
  message: `${birthdayGift.message}\n\n— ${birthdayGift.developerName}`,
};
