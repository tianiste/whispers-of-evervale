import type { DialogueDefinition } from './dialogue';

/** Everything personal about the finale lives here, so it can be edited without touching game logic. */
export const giftConfig = {
  recipientName: 'Hana',
  /** Used once, on the birthday card. */
  nickname: 'Banca',
  /** Used once, by Tian in the future apartment (src/data/echoGames.ts). */
  alternateNickname: 'Baber',
  developerName: 'Tian',
  /** The birthday card message. Leave blank to show the placeholder below. */
  finalMessage: 'Vse najboljše, draga. Rad te imam in želim ti res lep dan.',
};

const PLACEHOLDER_MESSAGE = 'Happy birthday. This little world was made just for you.';

export const birthdayCard = {
  caption: 'A memory made for you',
  heading: `Happy birthday, ${giftConfig.nickname || giftConfig.recipientName}`,
  message: giftConfig.finalMessage.trim() || PLACEHOLDER_MESSAGE,
  signature: `— ${giftConfig.developerName}`,
};

/** After Echo VI: the line that makes the whole game click, before the card. */
export const birthdayReveal = [
  'Every Echo was one of your memories. Ours, really.',
  'Somebody collected them one by one and hid them in a little horse game, so you could find them again.',
] as const;

/** Shown after the card. Each gift is unlocked by the items Echo VI grants. */
export const birthdayGifts = {
  intro: 'Your birthday gifts are waiting in Evervale.',
  items: [
    'Birthday teal outfit · in your wardrobe',
    'Teal & oak birthday tack · fitted on your horse',
    'Birthday Echo lantern · a stable decoration',
    'Cat bed for five · a stable decoration',
    'A spare key · the Echo VI keepsake',
  ],
} as const;

/** Back in Evervale after the card. */
export const birthdayReturn = {
  toast: `Happy birthday, ${giftConfig.recipientName}! Your new outfit is in the wardrobe (O); the tack and decorations are under H.`,
  /** Only when the player named their horse Sky. */
  sky: 'Sky tries on the new birthday tack and refuses to take it off.',
  keeper: `Happy birthday, ${giftConfig.recipientName}! Somebody asked me to hang the bunting. Wouldn’t say who. Tall fellow. Terrible jokes.`,
};

/** Reopening the card from a save made while it was open. */
export const birthdayFinale: DialogueDefinition = {
  speaker: birthdayCard.caption,
  message: `${birthdayCard.message}\n\n${birthdayCard.signature}`,
};
