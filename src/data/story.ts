import type { ItemId } from './items';
import { birthdayGift } from './birthdayGift';
import { getEcho, type EchoId } from './echoes';

export interface TrailPoint {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface StoryObjective {
  type: 'talk' | 'ride' | 'inspect' | 'cat' | 'equip' | 'decorate' | 'race' | 'mount' | 'shop' | 'trail' | 'care' | 'choose-horse' | 'echo';
  target: string;
  description: string;
  x?: number;
  y?: number;
  payoff?: string;
  reward?: ItemId;
  /** `trail` only: ordered mounted checkpoints. */
  points?: TrailPoint[];
  /** `trail` only: color of the drifting lights. */
  glow?: number;
}

export const careActions = ['brush', 'water', 'treat'] as const;

function echoObjective(id: EchoId, description: string): StoryObjective {
  const { site } = getEcho(id);
  return { type: 'echo', target: id, x: site.x, y: site.y, description };
}

// The final birthday reveal is reserved for Echo VI; `birthdayFinale` stays in birthdayGift.ts for it.
export const storyChapters: { name: string; objectives: StoryObjective[]; payoff: string; reward?: ItemId }[] = [
  {
    name: 'Welcome to Sunmeadow',
    objectives: [
      { type: 'talk', target: 'stable-keeper', x: 800, y: 550, description: 'Say hello to the Stable Keeper outside Sunmeadow Stable', payoff: `Welcome to Sunmeadow, ${birthdayGift.recipient}! WASD to walk, E to talk or take a closer look. Have a wander. The stable cat will find you first.` },
      { type: 'inspect', target: 'stable-nameplate', x: 855, y: 585, description: 'Take a look at the nameplate beside the stable door', payoff: `SUNMEADOW STABLE, and underneath, freshly painted: “${birthdayGift.recipient}”. Someone was expecting you.` },
      { type: 'cat', target: 'nomi', x: 740, y: 530, description: 'Pet Nomi, the stable cat. She likes company, within reason', payoff: 'Nomi sits on your foot. You have been adopted. Terms and conditions apply.' },
    ],
    payoff: 'A stable, a cat, and a keeper who already knows your name. The paddock horses are watching.',
  },
  {
    name: 'Meet Your Horse',
    objectives: [
      { type: 'choose-horse', target: 'paddock', x: 775, y: 605, description: 'Meet the three horses by the paddock fence south of the stable and choose your companion' },
      { type: 'mount', target: 'chosen-horse', description: 'Stand beside your new horse and press E to mount' },
      { type: 'ride', target: 'lane-bend', x: 1160, y: 310, description: 'Ride up the lane to the northeast bend', payoff: 'An easy canter, a flick of an ear. You are getting to know each other.' },
      { type: 'ride', target: 'stable-home', x: 825, y: 600, description: 'Ride back down to the stable' },
      { type: 'care', target: 'first-horse-care', description: 'Dismount beside your horse; H → Your horse to brush, water and give a treat', payoff: 'Brushed, watered, snacked. Your horse now considers you acceptable staff.' },
    ],
    payoff: 'You have a horse. More importantly, your horse has you.',
  },
  {
    name: 'Make It Yours',
    reward: 'teal-posy',
    objectives: [
      { type: 'equip', target: 'any-outfit', description: 'Open the wardrobe with O and pick an outfit for today', payoff: 'Excellent choice. Your horse agrees, which is rare.' },
      { type: 'decorate', target: 'any-slot', description: 'Open H → Stable and change one decoration', payoff: 'Much better. The stable finally looks lived in.' },
    ],
    payoff: 'A teal flower pot is yours. H → Stable to place it. Nomi has claimed joint ownership.',
  },
  {
    name: 'The First Ride',
    objectives: [
      { type: 'mount', target: 'chosen-horse', description: 'Mount up for a ride to the village' },
      { type: 'ride', target: 'lane-flowers', x: 565, y: 480, description: 'Follow the lane northwest toward the flowers' },
      { type: 'inspect', target: 'roadside-posy', x: 525, y: 445, description: 'Dismount and inspect the little blue-green posy beside the lane', payoff: 'Someone tied the stems with teal thread. A nice detail on an ordinary country road.' },
      { type: 'ride', target: 'village-arrival', x: 400, y: 350, description: 'Continue northwest into the village', payoff: 'Warm bread, birdsong, and a cat somewhere being extremely loud about it.' },
    ],
    payoff: 'The village is yours to explore. The baker has something set aside.',
  },
  {
    name: 'Village Day',
    objectives: [
      { type: 'talk', target: 'village-baker', x: 360, y: 330, description: 'Dismount and greet the baker outside the bakery', payoff: 'A welcome gift? Of course. Making you pay on your first day would be absolutely horrid, darling.' },
      { type: 'shop', target: 'bakery-gift', description: 'Open the bakery counter and collect your welcome gift' },
      { type: 'cat', target: 'miki', x: 450, y: 410, description: 'Pet Miki outside the bakery. You will hear him before you see him', payoff: 'Miki flops over and purrs like a small tractor. A loud, fluffy, very round tractor.' },
      { type: 'inspect', target: 'race-notice', x: 480, y: 465, description: 'Read the riding notice southeast of the village', payoff: 'Clearing Canter: follow the gates, take your time. Everyone who finishes gets a treat. Start east of Sunmeadow Stable.' },
    ],
    payoff: 'A small gift and an invitation to ride. A good village day.',
  },
  {
    name: 'First Race',
    objectives: [
      { type: 'mount', target: 'chosen-horse', description: 'Mount your horse for Clearing Canter' },
      { type: 'ride', target: 'race-arrival', x: 975, y: 650, description: 'Ride southeast to the race gate below the stable' },
      { type: 'race', target: 'clearing-canter', description: 'Press R at the gate and finish Clearing Canter. Any time counts' },
      { type: 'inspect', target: 'finish-ribbon', x: 1030, y: 700, description: 'Dismount and inspect the ribbon just southeast of the race gate', payoff: 'Your horse noses the ribbon. Its teal thread starts to glow on its own. East of the gate, something answers.' },
    ],
    payoff: 'You finished together. And something else seems to have noticed.',
  },
  {
    name: 'Echo I — A Spark in the Crowd',
    objectives: [
      { type: 'inspect', target: 'glowing-hoofprint', x: 1130, y: 660, description: 'Dismount and inspect the glowing hoofprint east of the race gate', payoff: 'A hoofprint full of light, humming like a distant bass line. Violet sparks drift away to the southeast.' },
      {
        type: 'trail', target: 'violet-sparks', glow: 0xc07bff, description: 'Ride after the violet sparks toward the southeast meadow',
        points: [
          { id: 'south-fence', name: 'Sparks past the south fence', x: 1290, y: 860 },
          { id: 'flower-dip', name: 'Sparks over the flower meadow', x: 1440, y: 930 },
          { id: 'dusk-edge', name: 'Where the light turns violet', x: 1545, y: 960 },
        ],
      },
      echoObjective('spark', 'Dismount and touch the pulsing light among the dusk stones'),
    ],
    payoff: 'The first Echo is restored. It felt less like ancient magic and more like a night out.',
  },
  {
    name: 'Echo II — Five Minutes Until Break',
    objectives: [
      { type: 'talk', target: 'stable-keeper', x: 800, y: 550, description: 'Tell the Stable Keeper about the Echo', payoff: 'Echoes? Old Evervale magic. They keep what people care about most. A club and a cigarette, though? Strange taste. Another glimmer drifted west, toward the pond.' },
      {
        type: 'trail', target: 'golden-glints', glow: 0xffc861, description: 'Ride after the golden glints toward the pond',
        points: [
          { id: 'lane-glint', name: 'Golden glints up the lane', x: 620, y: 540 },
          { id: 'village-bend', name: 'Glints past the village bend', x: 430, y: 420 },
          { id: 'pond-meadow', name: 'The warm light above the pond', x: 330, y: 470 },
        ],
      },
      echoObjective('break', 'Dismount and listen to the glowing string telephone north of the pond'),
    ],
    payoff: 'Two phones, one call a day. The Echoes are getting very specific.',
  },
  {
    name: 'Echo III — Half a Bed',
    objectives: [
      { type: 'inspect', target: 'pond-seashell', x: 315, y: 650, description: 'Dismount and inspect the glint at the edge of the pond', payoff: 'A seashell. In a pond. Nowhere near the sea. It smells faintly of salt and sunscreen. Blue lights drift north.' },
      {
        type: 'trail', target: 'blue-lights', glow: 0x7fb8ff, description: 'Ride after the blue lights to the north',
        points: [
          { id: 'meadow-flowers', name: 'Blue lights by the meadow flowers', x: 430, y: 470 },
          { id: 'village-lane', name: 'Blue lights up the village lane', x: 540, y: 300 },
          { id: 'first-stars', name: 'Under the first stars', x: 770, y: 215 },
        ],
      },
      echoObjective('half-bed', 'Dismount and touch the light on the starlit knoll'),
    ],
    payoff: 'Three Echoes. Three of your memories. Evervale has some explaining to do.',
  },
  {
    name: 'More Echoes Are Stirring',
    objectives: [
      { type: 'inspect', target: 'oak-stirring', x: 1480, y: 300, description: 'Follow the drifting lights to the old oak and dismount beneath it', payoff: 'The old oak hums. Somewhere inside it, more Echoes are still asleep. They are starting to stir.' },
    ],
    payoff: 'More Echoes are stirring… For now, Evervale is yours to roam.',
  },
];

export const storyObjectives = storyChapters.flatMap((chapter) => chapter.objectives.map((objective, index) => ({
  ...objective,
  id: `${chapter.name}:${objective.target}`,
  chapter: chapter.name,
  chapterEnd: index === chapter.objectives.length - 1,
})));

export type StoryStep = (typeof storyObjectives)[number];

export const echoStartIndex = storyObjectives.findIndex(o => o.chapter === 'Echo I — A Spark in the Crowd');

/** IDs a partially complete activity may record, in completion order for ordered activities. */
export function activityIds(objective: StoryObjective | undefined): readonly string[] {
  if (objective?.type === 'trail') return objective.points?.map(point => point.id) ?? [];
  if (objective?.type === 'care') return careActions;
  return [];
}
