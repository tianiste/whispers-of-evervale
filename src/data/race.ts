import type { EchoId } from './echoes';
import type { ItemId } from './items';

// Side-view races. Tracks and themes are data; RaceScene draws and runs any of them.
export type RaceTrackId = 'meadow-sprint' | 'forest-run' | 'moonlight-derby';
export type ObstacleKind = 'fence' | 'log' | 'puddle' | 'rock' | 'hay' | 'stream' | 'branch';
export type RaceThemeId = 'meadow' | 'forest' | 'moonlight';

export interface ObstacleShape {
  label: string;
  width: number;
  height: number;
  /** Flat hazards are only hit while the horse is on the ground. */
  flat: boolean;
  splash: boolean;
}

export const obstacleShapes: Record<ObstacleKind, ObstacleShape> = {
  fence: { label: 'fence', width: 30, height: 48, flat: false, splash: false },
  log: { label: 'log', width: 66, height: 28, flat: false, splash: false },
  puddle: { label: 'puddle', width: 84, height: 8, flat: true, splash: true },
  rock: { label: 'rock', width: 42, height: 32, flat: false, splash: false },
  hay: { label: 'hay bale', width: 50, height: 44, flat: false, splash: false },
  stream: { label: 'stream', width: 124, height: 8, flat: true, splash: true },
  branch: { label: 'fallen branch', width: 92, height: 24, flat: false, splash: false },
};

export interface RaceTheme {
  sky: readonly [number, number];
  hills: number;
  trees: number;
  /** Tree silhouette for the mid layer. */
  treeShape: 'round' | 'pine';
  treeDensity: number;
  grass: number;
  dirt: number;
  /** Floating detail: pollen by day, falling leaves, fireflies at night. */
  motes: { color: number; count: number; drift: 'rise' | 'fall' };
  moon: boolean;
}

export const raceThemes: Record<RaceThemeId, RaceTheme> = {
  meadow: { sky: [0x9fd6e8, 0xf4e9cf], hills: 0x8fbf88, trees: 0x5f9a5c, treeShape: 'round', treeDensity: 0.5, grass: 0x6f9f4f, dirt: 0xc8a46e, motes: { color: 0xfff2b0, count: 18, drift: 'rise' }, moon: false },
  forest: { sky: [0x7fb8a8, 0xd8e6c0], hills: 0x4f7f58, trees: 0x2f5a3c, treeShape: 'pine', treeDensity: 1, grass: 0x4f7a3e, dirt: 0x8a6a48, motes: { color: 0xd8a04a, count: 22, drift: 'fall' }, moon: false },
  moonlight: { sky: [0x0b1630, 0x2a3a6a], hills: 0x1c2a4a, trees: 0x142038, treeShape: 'round', treeDensity: 0.7, grass: 0x2c4a4a, dirt: 0x4a4a5e, motes: { color: 0xd8ff9a, count: 26, drift: 'rise' }, moon: true },
};

export interface RaceTrack {
  id: RaceTrackId;
  name: string;
  tagline: string;
  theme: RaceThemeId;
  /** Distance from start to finish line, in pixels. */
  length: number;
  obstacles: readonly { kind: ObstacleKind; at: number }[];
  /** Given on the first finish; later finishes give a Horse Apple. */
  reward: ItemId;
  /** Null: always open. */
  unlock: { afterTrack?: RaceTrackId; afterEcho?: EchoId; hint: string } | null;
}

const course = (kinds: string): { kind: ObstacleKind; at: number }[] => kinds.trim().split(/\s+/).map(entry => {
  const [kind, at] = entry.split('@') as [ObstacleKind, string];
  return { kind, at: Number(at) };
});

export const raceTracks: readonly RaceTrack[] = [
  {
    id: 'meadow-sprint', name: 'Meadow Sprint', theme: 'meadow', length: 7000, reward: 'horse-apple', unlock: null,
    tagline: 'A sunny dash past hay bales and puddles. Perfect for a first race.',
    obstacles: course('fence@950 puddle@1650 hay@2350 log@3000 fence@3650 puddle@4250 rock@4850 hay@5450 fence@6150'),
  },
  {
    id: 'forest-run', name: 'Forest Run', theme: 'forest', length: 9400, reward: 'forest-rosette',
    unlock: { afterTrack: 'meadow-sprint', hint: 'Finish the Meadow Sprint first.' },
    tagline: 'A longer ride under the pines: logs, streams and branches.',
    obstacles: course('log@900 branch@1500 stream@2100 rock@2650 log@3200 branch@3800 stream@4350 log@4900 rock@5450 branch@6000 fence@6550 stream@7100 log@7650 branch@8200 rock@8750'),
  },
  {
    id: 'moonlight-derby', name: 'Moonlight Derby', theme: 'moonlight', length: 10200, reward: 'horse-apple',
    unlock: { afterEcho: 'first-winter', hint: 'Opens once five Echoes are restored.' },
    tagline: 'Fireflies, starlight and a few surprises in the dark.',
    obstacles: course('fence@900 puddle@1450 log@2000 hay@2380 rock@2950 stream@3500 branch@4050 fence@4430 puddle@4950 log@5500 rock@5880 hay@6450 stream@7000 fence@7550 branch@8100 log@8480 rock@9050 fence@9600'),
  },
];

/** The world-side gate where the Race Steward waits. */
export const raceGate = { x: 975, y: 650, radius: 55 } as const;

export const RACE_PENALTY_MS = 1000;

export function getRaceTrack(id: string): RaceTrack {
  const track = raceTracks.find(candidate => candidate.id === id);
  if (!track) throw new Error(`Unknown race track: ${id}`);
  return track;
}

export function isRaceTrackId(value: unknown): value is RaceTrackId {
  return raceTracks.some(({ id }) => id === value);
}
