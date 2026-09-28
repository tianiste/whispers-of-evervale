import type { ItemId } from './items';
import { birthdayGift } from './birthdayGift';
import { countrysideTrails, type JourneyPoint } from './journeys';

export interface StoryObjective {
  type: 'talk' | 'ride' | 'inspect' | 'cat' | 'equip' | 'decorate' | 'race' | 'mount' | 'shop' | 'trail' | 'search' | 'pattern' | 'care' | 'quiz';
  target: string;
  description: string;
  x?: number;
  y?: number;
  payoff?: string;
  reward?: ItemId;
  points?: JourneyPoint[];
  hint?: string;
  quizQuestion?: string;
  quizOptions?: { id: string; text: string; correct?: boolean; response?: string }[];
}


// Each leg ends at a small discovery so long rides have natural places to dismount.
function journey(target: string, id: string): StoryObjective[] {
  const route = countrysideTrails.find(trail => trail.id === id);
  if (!route) throw new Error(`Unknown countryside trail: ${id}`);
  const objectives: StoryObjective[] = [];
  for (let start = 0; start < route.points.length; start += 9) {
    const points = route.points.slice(start, start + 9);
    const first = points[0]!;
    const last = points[points.length - 1]!;
    objectives.push({ type: 'trail', target: start === 0 ? target : `${target}-leg-${start}`, description: `Ride ${route.name.toLowerCase()} — follow the marked countryside path`, x: first.x, y: first.y, points });
    if (start + 9 < route.points.length) objectives.push({ type: 'inspect', target: `${target}-rest-${start}`, x: last.x + 65, y: last.y + 45, description: `Dismount at the ${route.name.toLowerCase()} waystone and inspect its carving`, payoff: route.theme === 'echo' ? 'A little horse is carved beside a cat. Both are following a ribbon toward the oak.' : route.theme === 'ridge' ? 'A weather-worn horseshoe points to the next overlook. The countryside opens wide below.' : route.theme === 'river' ? 'Tiny hoofprints cross the stone beside a carved kingfisher. Someone else loved stopping here.' : route.theme === 'woodland' ? 'A fern curls around a carved saddle. Between the trees, another path catches the light.' : route.theme === 'orchard' ? 'A carved apple and a tiny sleeping cat. This seems like a sensible place for a picnic.' : 'Wildflowers wind around a little carved horse. The path continues through the grass.' });
  }
  return objectives;
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
      { type: 'care', target: 'first-horse-care', description: 'Dismount beside your horse; H → Your horse to brush, water, and offer a treat', payoff: 'A brushed coat, fresh water, a snack. Ready for a proper outing.' },
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
      ...journey('orchard-country-ride', 'orchard-outing'),
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
    name: 'Echo I — A Spark in the Crowd',
    objectives: [
      { type: 'inspect', target: 'glowing-hoofprint', x: 1130, y: 660, description: 'Dismount and inspect the glowing hoofprint east of the race gate', payoff: 'A hoofprint full of light. Your horse is curious, not afraid. Another glimmer waits farther south.' },
      ...journey('southern-glimmer', 'willow-water'),
      {
        type: 'quiz',
        target: 'echo-1',
        x: 18000,
        y: 40000,
        description: 'Dismount and inspect the glowing memory fragment',
        quizQuestion: 'Who was there that night?',
        quizOptions: [
          { id: 'opt1', text: 'Only Hana and Tian', response: 'That is one version of events.' },
          { id: 'opt2', text: 'Maj, Tilen and friends', correct: true, response: 'Correct.' },
          { id: 'opt3', text: 'Three suspicious cats in a trenchcoat', response: 'Suspicious answer. The Echo seems unconvinced.' }
        ],
        payoff: 'A stylized pixel-art club. Dark environment, teal and purple lighting. Silhouettes and light pulses.'
      },
      {
        type: 'quiz',
        target: 'echo-1-part2',
        x: 20000,
        y: 40000,
        description: 'Follow the spark and inspect the next fragment',
        quizQuestion: 'What happened during the world\'s most questionable first impression?',
        quizOptions: [
          { id: 'opt1', text: 'A completely normal handshake', response: 'The Echo shakes its head.' },
          { id: 'opt2', text: 'Hana accidentally touched Tian\'s left cheek with a lit cigarette', correct: true, response: 'Some people bring flowers. Apparently we went with mild facial burns.' },
          { id: 'opt3', text: 'A dance battle', response: 'If only.' }
        ],
        payoff: 'Some people bring flowers. Apparently we went with mild facial burns. At this stage, it feels like a strangely specific Echo.'
      }
    ],
    payoff: 'The fragment settles into a small warm spark.'
  },
  {
    name: 'Echo II — Five Minutes Until Break',
    objectives: [
      ...journey('fern-hollow-ride', 'fern-hollows'),
      {
        type: 'quiz',
        target: 'echo-2',
        x: 33000,
        y: 44000,
        description: 'Dismount to find the second Echo fragment in the eastern meadow',
        quizQuestion: 'What were we waiting for more than anything?',
        quizOptions: [
          { id: 'opt1', text: 'The shift to end', response: 'True, but not the whole truth.' },
          { id: 'opt2', text: 'Going to the sea together', correct: true, response: 'Yes. They were barely able to wait.' },
          { id: 'opt3', text: 'Lunch break', response: 'Food is good, but no.' }
        ],
        payoff: 'A split memory: the GEN-I office on one side, the warehouse on the other. Phones connecting them.'
      }
    ],
    payoff: 'They wanted to talk every day even while working.'
  },
  {
    name: 'Echo III — Half a Bed',
    objectives: [
      ...journey('eastern-bend', 'breeze-memory'),
      {
        type: 'quiz',
        target: 'echo-3',
        x: 58000,
        y: 33000,
        description: 'Dismount to find the third fragment at the silver reed shore',
        quizQuestion: 'What game were we playing in the camper van?',
        quizOptions: [
          { id: 'opt1', text: 'Minecraft', response: 'A good guess, but no.' },
          { id: 'opt2', text: 'Brawl Stars', correct: true, response: 'Exactly.' },
          { id: 'opt3', text: 'Fortnite', response: 'The camper van didn\'t have the setup for that.' }
        ],
        payoff: 'A cozy evening playing Brawl Stars together.'
      },
      {
        type: 'quiz',
        target: 'echo-3-part2',
        x: 58200,
        y: 33200,
        description: 'Inspect the final piece of the memory',
        quizQuestion: 'What did we spill on the bed?',
        quizOptions: [
          { id: 'opt1', text: 'Coffee', response: 'Fortunately not.' },
          { id: 'opt2', text: 'Water', correct: true, response: 'A camper van. One wet bed. Half a mattress was apparently enough.' },
          { id: 'opt3', text: 'Juice', response: 'Sticky, but no.' }
        ],
        payoff: 'Hana and Tian squeezed onto the remaining dry side.'
      }
    ],
    payoff: 'A strange feeling... these memories seem connected to Hana and Tian.'
  },
  {
    name: 'A Memory Made for You',
    reward: 'echo-tack',
    objectives: [
      { type: 'inspect', target: 'oak-ribbon', x: 61065, y: 44045, description: 'Dismount and inspect the ribbon on the eastern side of the old oak', payoff: `A tiny tag reads “For ${birthdayGift.recipient}.” The whole trail was an invitation.` },
      { type: 'inspect', target: 'birthday-finale', x: 61000, y: 44000, description: 'Open the birthday Echo beneath the old oak' },
    ],
    payoff: 'Happy birthday. Your gifts are ready, your horse is waiting, and Evervale is yours to wander.',
  }
];

export const storyObjectives = storyChapters.flatMap((chapter) => chapter.objectives.map((objective, index) => ({
  ...objective,
  id: `${chapter.name}:${objective.target}`,
  chapter: chapter.name,
  chapterEnd: index === chapter.objectives.length - 1,
})));

export const echoStartIndex = storyObjectives.findIndex(o => o.chapter === 'Echo I — A Spark in the Crowd');
export const finalRideStartIndex = storyObjectives.findIndex(o => o.chapter === 'Echo III — Half a Bed');
