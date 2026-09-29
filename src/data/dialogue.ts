export interface DialogueDefinition {
  speaker: string;
  message: string;
}

export const stableKeeperGreeting: DialogueDefinition = {
  speaker: 'Stable Keeper',
  message: 'Welcome! Your horse is waiting nearby. Press E when you are close enough to mount.',
};

export const echoClues: Record<'stable-keeper' | 'trail-guide', DialogueDefinition> = {
  'stable-keeper': {
    speaker: 'Stable Keeper',
    message: 'Echoes stir when they are ready, not before. Keep an eye on the lights, and on the old oak in the northeast.',
  },
  'trail-guide': {
    speaker: 'Trail Guide',
    message: 'That oak has been here longer than the village. Head east across the clearing and listen; the bell only rings when the wind is still.',
  },
};
