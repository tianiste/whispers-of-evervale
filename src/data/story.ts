import type { ItemId } from './items';
import { birthdayGift } from './birthdayGift';

export interface StoryObjective {
  type: 'talk' | 'ride' | 'inspect' | 'cat' | 'equip' | 'decorate' | 'race' | 'mount' | 'shop';
  target: string;
  description: string;
  x?: number;
  y?: number;
  payoff?: string;
  reward?: ItemId;
}

export const storyChapters: { name: string; objectives: StoryObjective[]; payoff: string; reward?: ItemId }[] = [
  {
    name: 'Welcome to Evervale',
    objectives: [
      { type: 'talk', target: 'stable-keeper', x: 800, y: 550, description: 'Meet the Stable Keeper beside Sunmeadow Stable', payoff: `Welcome, ${birthdayGift.recipient}. Your horse has already inspected the place. Apparently it will do.` },
      { type: 'inspect', target: 'stable-nameplate', x: 855, y: 585, description: 'Dismount and inspect the nameplate beside the stable with E', payoff: 'A clean nameplate, a warm stall, and room for your things. Open H whenever you want to check on your chosen horse.' },
      { type: 'mount', target: 'chosen-horse', description: 'Walk beside your chosen horse and press E to mount' },
      { type: 'ride', target: 'paddock-turn', x: 980, y: 410, description: 'Ride northeast to the paddock turn', payoff: 'An easy turn, a flick of an ear. You are getting to know each other.' },
    ],
    payoff: 'A horse, a stable, and a whole day with no hurry.',
  },
  {
    name: 'A Stable of Your Own',
    reward: 'teal-posy',
    objectives: [
      { type: 'ride', target: 'stable-home', x: 825, y: 600, description: 'Ride southwest back to your stable' },
      { type: 'equip', target: 'any-outfit', description: 'Open the wardrobe with O and choose an outfit' },
      { type: 'decorate', target: 'any-slot', description: 'Open H and choose a decoration for one stable slot' },
      { type: 'cat', target: 'stable-cat', x: 740, y: 530, description: 'Dismount, then pet the cream tabby west of the stable with E', payoff: 'The tabby examines your decorating work, then sits down. Approval, probably.' },
    ],
    payoff: 'A teal flower pot is yours — H → Stable to place it. The cat has claimed joint ownership.',
  },
  {
    name: 'The First Ride',
    objectives: [
      { type: 'mount', target: 'chosen-horse', description: 'Mount up for the village ride' },
      { type: 'ride', target: 'lane-flowers', x: 565, y: 480, description: 'Follow the lane northwest to the flowers' },
      { type: 'inspect', target: 'roadside-posy', x: 525, y: 445, description: 'Dismount and inspect the little blue-green posy beside the lane', payoff: 'Someone tied the stems with teal thread. A nice detail on an ordinary country road.' },
      { type: 'ride', target: 'village-arrival', x: 400, y: 350, description: 'Continue northwest into the village', payoff: 'Warm bread, birdsong, and a cat pretending not to watch you arrive.' },
    ],
    payoff: 'The village is yours to explore. The baker has something set aside.',
  },
  {
    name: 'Village Day',
    objectives: [
      { type: 'talk', target: 'village-baker', x: 360, y: 330, description: 'Dismount and greet the baker outside the bakery', payoff: 'A welcome gift? Of course. Making you pay on your first day would be absolutely horrid, darling.' },
      { type: 'shop', target: 'bakery-gift', description: 'Open the bakery counter and collect your welcome gift' },
      { type: 'cat', target: 'calico-cat', x: 450, y: 410, description: 'Dismount, then pet the calico southeast of the bakery', payoff: 'The calico is very interested in your parcel. Fashion critic, or just a fan of string?' },
      { type: 'inspect', target: 'race-notice', x: 480, y: 465, description: 'Read the riding notice southeast of the village', payoff: 'Clearing Canter: follow the gates, take your time. Everyone who finishes gets a treat. Start east of Sunmeadow Stable.' },
    ],
    payoff: 'A small gift and an invitation to ride. A good village day.',
  },
  {
    name: 'First Race',
    objectives: [
      { type: 'mount', target: 'chosen-horse', description: 'Mount your horse for Clearing Canter' },
      { type: 'ride', target: 'race-arrival', x: 975, y: 650, description: 'Ride southeast to the race gate below the stable' },
      { type: 'race', target: 'clearing-canter', description: 'Press R at the gate and finish Clearing Canter — any time counts' },
      { type: 'inspect', target: 'finish-ribbon', x: 1030, y: 700, description: 'Dismount and inspect the ribbon just southeast of the race gate', payoff: 'Your horse noses the ribbon. For a moment, its teal thread shines without catching the sun.' },
    ],
    payoff: 'You finished together. And something else seems to have noticed.',
  },
  {
    name: 'Something Strange',
    objectives: [
      { type: 'inspect', target: 'glowing-hoofprint', x: 1130, y: 660, description: 'Dismount and inspect the glowing hoofprint east of the race gate', payoff: 'A hoofprint full of light. Your horse is curious, not afraid. Another glimmer waits farther south.' },
      { type: 'ride', target: 'southern-glimmer', x: 1120, y: 880, description: 'Ride south to the glimmer in the meadow' },
      { type: 'inspect', target: 'echo-blossom', x: 1180, y: 875, description: 'Dismount and inspect the unusual teal blossom', payoff: 'The blossom hums like a tiny bell. Three sparks drift away toward the eastern meadow.' },
      { type: 'inspect', target: 'bent-grass', x: 1320, y: 830, description: 'Follow the bent grass east and inspect the pale mark', payoff: 'No broken stems. Only a line of light, as if a memory rode through here.' },
    ],
    payoff: 'An Echo trail is waking up. Follow the little lights.',
  },
  {
    name: 'Echo Trail',
    objectives: [
      { type: 'inspect', target: 'fragment-meadow', reward: 'echo-fragment', x: 1450, y: 780, description: 'Dismount to find the first Echo fragment in the eastern meadow', payoff: 'A sunny field, the rhythm of hooves. The fragment settles into a small warm spark.' },
      { type: 'ride', target: 'eastern-bend', x: 1560, y: 575, description: 'Ride north along the eastern meadow edge' },
      { type: 'inspect', target: 'fragment-breeze', reward: 'echo-fragment', x: 1510, y: 465, description: 'Dismount to find the second fragment northwest of the bend', payoff: 'A breeze lifts a ribbon. Teal again. This is starting to feel less like coincidence.' },
      { type: 'inspect', target: 'fragment-bell', reward: 'echo-fragment', x: 1340, y: 375, description: 'Dismount to find the third fragment farther northwest', payoff: 'Three notes join into one clear bell. A tiny village sign appears in the light: ask the Trail Guide.' },
    ],
    payoff: 'The scattered lights belong together. Someone in the village may know why.',
  },
  {
    name: 'Personal Signs',
    objectives: [
      { type: 'talk', target: 'trail-guide', x: 250, y: 280, description: 'Ride west, then dismount to meet the Trail Guide beside the village hall', payoff: 'Echoes remember things people care about. Horses, little places, company. That gray cat has been guarding one all morning.' },
      { type: 'cat', target: 'gray-cat', x: 200, y: 390, description: 'Dismount, then pet the gray cat south of the village hall', payoff: 'The cat stretches, revealing a tiny embroidered patch. Its heroic guarding shift is apparently over.' },
      { type: 'inspect', target: 'cat-patch', x: 235, y: 420, description: 'Dismount and inspect the patch beside the gray cat', payoff: 'A cat in a very small riding hat. The stitching is surprisingly serious about a deeply unserious subject.' },
      { type: 'inspect', target: 'quarter-horse-sketch', x: 340, y: 455, description: 'Dismount and inspect the sketch southeast of the cat', payoff: 'A sturdy Quarter Horse, a teal ribbon, open countryside. On the back: “For someone with excellent taste in horses.”' },
    ],
    payoff: 'Cats, countryside, and a favorite kind of horse. These signs are beginning to sound familiar.',
  },
  {
    name: 'Final Ride',
    objectives: [
      { type: 'mount', target: 'chosen-horse', description: 'Mount up for one last ride along the Echo trail' },
      { type: 'ride', target: 'home-lights', x: 860, y: 650, description: 'Follow the lane southeast past the warm stable lights' },
      { type: 'ride', target: 'flower-view', x: 1360, y: 880, description: 'Ride southeast through the open wildflower meadow', payoff: 'The little lights keep pace beside you. No chase, no hurry. Just good company.' },
      { type: 'ride', target: 'oak-approach', x: 1610, y: 380, description: 'Curve north along the eastern edge toward the old oak' },
    ],
    payoff: 'The bell is quiet now. Its light is waiting beneath the oak.',
  },
  {
    name: 'A Memory Made for You',
    reward: 'echo-tack',
    objectives: [
      { type: 'inspect', target: 'oak-ribbon', x: 1550, y: 330, description: 'Dismount and inspect the ribbon on the eastern side of the old oak', payoff: `A tiny tag reads “For ${birthdayGift.recipient}.” The whole trail was an invitation.` },
      { type: 'inspect', target: 'birthday-finale', x: 1480, y: 300, description: 'Open the birthday Echo beneath the old oak' },
    ],
    payoff: 'Happy birthday. Your gifts are ready, your horse is waiting, and Evervale is yours to wander.',
  },
];

export const storyObjectives = storyChapters.flatMap((chapter) => chapter.objectives.map((objective, index) => ({
  ...objective,
  chapter: chapter.name,
  chapterEnd: index === chapter.objectives.length - 1,
})));

export const echoStartIndex = storyObjectives.findIndex(o => o.chapter === 'Something Strange');
export const finalRideStartIndex = storyObjectives.findIndex(o => o.chapter === 'Final Ride');
