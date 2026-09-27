export interface DialogueDefinition {
  speaker: string;
  message: string;
}

export const stableKeeperGreeting: DialogueDefinition = {
  speaker: 'Stable Keeper',
  message: 'Welcome! Your horse is waiting nearby. Press E when you are close enough to mount.',
};
