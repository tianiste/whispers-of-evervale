export const clearingRace = {
  name: 'Clearing Canter',
  start: { x: 975, y: 650, radius: 55 },
  checkpoints: [
    { name: 'South Meadow', x: 930, y: 940, radius: 55 },
    { name: 'East Grove', x: 1500, y: 430, radius: 55 },
    { name: 'North Path', x: 700, y: 280, radius: 55 },
  ],
  reward: 'horse-apple',
} as const;
