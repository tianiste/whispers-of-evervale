import type { ItemId } from './items';
import { giftConfig } from './birthdayGift';
import { getEcho, type EchoId } from './echoes';
import { styleParade } from './fashion';
import { bolt } from './village';

export interface TrailPoint {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface StoryObjective {
  type: 'talk' | 'ride' | 'inspect' | 'cat' | 'pet' | 'equip' | 'decorate' | 'race' | 'mount' | 'shop' | 'trail' | 'care' | 'groom'
    | 'fashion' | 'choose-horse' | 'echo';
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

export const storyChapters: { name: string; objectives: StoryObjective[]; payoff: string; reward?: ItemId }[] = [
  {
    name: 'Welcome to Sunmeadow',
    objectives: [
      { type: 'talk', target: 'stable-keeper', x: 800, y: 550, description: 'Say hello to the Stable Keeper outside Sunmeadow Stable', payoff: `Welcome to Sunmeadow, ${giftConfig.recipientName}! WASD to walk, E to talk or take a closer look. Have a wander. The stable cat will find you first.` },
      { type: 'inspect', target: 'stable-nameplate', x: 855, y: 585, description: 'Take a look at the nameplate beside the stable door', payoff: `SUNMEADOW STABLE, and underneath, freshly painted: “${giftConfig.recipientName}”. Someone was expecting you.` },
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
      { type: 'care', target: 'first-horse-care', description: 'Dismount beside your horse; H → Your horse to brush (a quick groom), water and give a treat', payoff: 'Brushed, watered, snacked. Your horse now considers you acceptable staff.' },
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
      { type: 'talk', target: 'village-baker', x: 360, y: 330, description: 'Dismount and greet the baker outside the bakery', payoff: 'A welcome gift? Of course. Nobody pays on their first day in Sunmeadow. That is the rule, and I just made it up.' },
      { type: 'shop', target: 'bakery-gift', description: 'Open the bakery counter and collect your welcome gift' },
      { type: 'cat', target: 'miki', x: 450, y: 410, description: 'Pet Miki outside the bakery. You will hear him before you see him', payoff: 'Miki flops over and purrs like a small tractor. A loud, fluffy, very round tractor.' },
      { type: 'inspect', target: 'race-notice', x: 480, y: 465, description: 'Read the riding notice southeast of the village', payoff: 'Meadow Sprint: jump the fences, splash past the puddles, take your time. Everyone who finishes gets a treat. Ask the Race Steward east of Sunmeadow Stable.' },
    ],
    payoff: 'A small gift and an invitation to ride. A good village day.',
  },
  {
    name: 'First Race',
    objectives: [
      { type: 'mount', target: 'chosen-horse', description: 'Mount your horse for the Meadow Sprint' },
      { type: 'ride', target: 'race-arrival', x: 975, y: 650, description: 'Ride southeast to the race gate below the stable' },
      { type: 'race', target: 'meadow-sprint', x: 1035, y: 612, description: 'Talk to the Race Steward (E) and ride the Meadow Sprint. Any time counts' },
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
    name: 'Not in the Records',
    objectives: [
      { type: 'talk', target: 'village-historian', x: 150, y: 290, description: 'Ask the Village Historian beside the village hall about the Echoes', payoff: 'A hard techno club? A GEN-I office? A camper van in Banjole? I checked every ledger since the founding. These memories aren’t in any Evervale records.' },
      { type: 'fashion', target: 'style-parade', x: 480, y: 300, reward: styleParade.reward, description: 'Enter Madame Rosette’s Style Parade by the bakery. Any look that fits the theme wins', payoff: 'Three themes, three triumphs. The scarecrow will never recover.' },
    ],
    payoff: 'The village has no record of the Echoes. The Echoes, however, have excellent records of you.',
  },
  {
    name: 'Echo IV — Improvised Cuisine',
    objectives: [
      { type: 'groom', target: 'race-ready', description: 'A longer ride needs a proper shine: dismount beside your horse, H → Your horse → Brush', payoff: 'Gleaming, brushed and extremely pleased with themselves. Ready for the forest.' },
      { type: 'race', target: 'forest-run', x: 1035, y: 612, description: 'Talk to the Race Steward and ride the Forest Run', payoff: 'Through the pines and out the other side. Something silver glints near the gate.' },
      { type: 'inspect', target: 'foil-glint', x: 1120, y: 700, description: 'Dismount and inspect the silver glint southeast of the race gate', payoff: 'Aluminium foil, folded into a very determined little boat. It smells of oregano. Silver hoofprints lead east.' },
      {
        type: 'trail', target: 'silver-hoofprints', glow: 0xd8f0ff, description: 'Ride after the silver hoofprints into the east meadow',
        points: [
          { id: 'east-fence', name: 'Silver hoofprints past the fence', x: 1250, y: 640 },
          { id: 'east-meadow', name: 'Through the east meadow', x: 1420, y: 660 },
          { id: 'sea-air', name: 'Where the air smells of the sea', x: 1510, y: 590 },
        ],
      },
      echoObjective('cuisine', 'Dismount and touch the light at the seaside picnic'),
      { type: 'decorate', target: 'foil-tray', description: 'Hang the foil lasagne tray in the stable: H → Stable, pick a slot', payoff: 'Framed. Displayed. Structurally questionable. Perfect.' },
    ],
    payoff: 'A foil tray on the stable wall. Nobody in Evervale will ever understand it.',
  },
  {
    name: 'Echo V — Cards, Snow, and Orehi',
    objectives: [
      { type: 'inspect', target: 'summer-snowflake', x: 700, y: 760, description: 'Dismount and inspect the sparkle south of the paddock fence', payoff: 'A snowflake. In summer. It refuses to melt, and it smells faintly of Nutella. Frosty hoofprints drift southwest.' },
      {
        type: 'trail', target: 'frost-hoofprints', glow: 0xbfe8ff, description: 'Ride after the frosty hoofprints to the southwest',
        points: [
          { id: 'frost-grass', name: 'Frost on the summer grass', x: 700, y: 850 },
          { id: 'frost-prints', name: 'Hoofprints in the frost', x: 610, y: 905 },
          { id: 'first-snow', name: 'Where the snow begins', x: 560, y: 960 },
        ],
      },
      echoObjective('first-winter', 'Dismount and touch the light in the frosted hollow'),
    ],
    payoff: 'Five Echoes: cards, snow and orehi among them. Somewhere, a sixth light is flickering.',
  },
  {
    name: 'More Echoes Are Stirring',
    objectives: [
      { type: 'pet', target: bolt.id, x: bolt.x, y: bolt.y, description: `Something is splashing in the pond. Say hello to the ${bolt.breed}`, payoff: 'His collar says BOLT. Nobody in the village owns a black Flat-Coated Retriever, yet he acts like he has known you for years.' },
      { type: 'inspect', target: 'oak-stirring', x: 1480, y: 300, description: 'Ride to the old oak in the northeast and dismount beneath its lights', payoff: 'Five lights circle the old oak. The sixth flickers, warm and unsteady, then slips out of the ring and drifts southwest, toward the stable.' },
    ],
    payoff: 'Echoes restored: 5 / 6. One Echo remains, and it feels different. It isn’t waiting to be remembered.',
  },
  {
    name: 'Echo VI — Not Yet',
    objectives: [
      {
        type: 'trail', target: 'sixth-light', glow: 0x77ffe0, description: 'Mount up and follow the sixth light. It seems to know the way home',
        points: [
          { id: 'oak-meadow', name: 'The sixth light leaves the oak', x: 1330, y: 330 },
          { id: 'north-lane', name: 'Down the lane it knows', x: 1200, y: 390 },
          { id: 'almost-home', name: 'Almost home', x: 1080, y: 440 },
        ],
      },
      echoObjective('future', 'Dismount and touch the light beside Sunmeadow Stable'),
    ],
    payoff: `All six Echoes restored. The last one hasn’t happened yet. Happy birthday, ${giftConfig.recipientName}.`,
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
  if (objective?.type === 'fashion') return styleParade.rounds.map(round => round.id);
  return [];
}

/** Activities whose steps must happen in order. */
export function isOrderedActivity(objective: StoryObjective | undefined): boolean {
  return objective?.type === 'trail' || objective?.type === 'fashion';
}
