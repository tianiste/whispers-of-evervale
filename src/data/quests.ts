import type { ItemId } from './items';

export type QuestObjective =
  | { type: 'talk'; target: 'stable-keeper'; description: string }
  | { type: 'reach'; target: 'clearing-marker'; x: number; y: number; description: string }
  | { type: 'collect'; target: 'wildflower'; x: number; y: number; description: string }
  | { type: 'interact'; target: 'chosen-horse'; description: string };

export const firstRideQuest = {
  name: 'A First Ride',
  reward: 'horse-apple' as ItemId,
  objectives: [
    { type: 'talk', target: 'stable-keeper', description: 'Talk to the Stable Keeper' },
    { type: 'reach', target: 'clearing-marker', x: 1300, y: 420, description: 'Reach the clearing marker' },
    { type: 'collect', target: 'wildflower', x: 1320, y: 820, description: 'Collect the wildflower with E' },
    { type: 'interact', target: 'chosen-horse', description: 'Interact with your horse' },
  ],
} as const;
