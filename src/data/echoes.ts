import type { ItemId } from './items';

// Adding an Echo: define it here, add a stage for its setting in src/art/EchoStages.ts,
// a site look in src/art/EchoSites.ts, and an `echo` objective in src/data/story.ts.
export type EchoId = 'spark' | 'break' | 'half-bed' | 'cuisine' | 'first-winter' | 'future';
export type EchoSetting = 'club' | 'split' | 'camper' | 'flat' | 'winter' | 'future';
/** Canvas minigames in src/minigames; content for each lives in src/data/echoGames.ts. */
export type MinigameId = 'holiday-map' | 'creature-catch' | 'foil-tray' | 'card-pack' | 'snowball' | 'orehi' | 'future-home';

export interface EchoOption {
  text: string;
  correct?: true;
  /** Shown after picking this option; wrong options fall back to wrongAnswerLines. */
  response?: string;
}

export interface QuizStep {
  kind: 'quiz';
  id: string;
  question: string;
  options: readonly EchoOption[];
  /** Every option moves the memory on; options without a response go straight to the next step. */
  open?: true;
  /** Stage animation played when the step is solved. */
  cue?: string;
}

export interface MatchStep {
  kind: 'match';
  id: string;
  prompt: string;
  /** Authored in matching order; the panel shuffles the right column for display. */
  pairs: readonly { left: string; right: string; cue?: string }[];
  misses: readonly string[];
  solved: string;
}

/** Steps played on the Echo canvas with the panel hidden. */
interface CanvasStep {
  id: string;
  /** Shown in the panel before the step starts. */
  intro: string;
  solved: string;
  /** Stage cue that sets the scene before the intro, e.g. a backdrop change. */
  backdrop?: string;
  /** Stage cue played once the step is solved. */
  cue?: string;
}

/** Drag each fragment into its matching slot of the broken memory. */
export interface ReconstructStep extends CanvasStep {
  kind: 'reconstruct';
  fragments: readonly string[];
  misses: readonly string[];
}

export interface PlayStep extends CanvasStep {
  kind: 'play';
  game: MinigameId;
}

export type EchoStep = QuizStep | MatchStep | ReconstructStep | PlayStep;

export interface EchoDefinition {
  id: EchoId;
  numeral: string;
  title: string;
  setting: EchoSetting;
  /** Where the Echo waits in the world; story objectives read their position from here. */
  site: { x: number; y: number; name: string };
  intro: readonly string[];
  steps: readonly EchoStep[];
  completion: readonly string[];
  /** Hana's line back in Evervale; escalates from curiosity to realization. */
  reflection: string;
  reward: ItemId;
  /** Shown under the title for the whole Echo. */
  memoryDate?: string;
  /** Lines held on the darkened canvas before the intro. */
  prelude?: readonly string[];
  /** Granted along with the keepsake. */
  gifts?: readonly ItemId[];
  /** The completion lines play on the canvas, then the birthday reveal replaces the usual return panel. */
  finale?: true;
}

export const wrongAnswerLines = ['The Echo seems unconvinced.', 'That is one version of events.', 'Suspicious answer.'] as const;

export const echoes: readonly EchoDefinition[] = [
  {
    id: 'spark',
    numeral: 'I',
    title: 'A Spark in the Crowd',
    setting: 'club',
    site: { x: 1650, y: 1000, name: 'the dusk stones' },
    intro: [
      'The light swallows the meadow. Then comes the bass.',
      'A dark hall full of teal and purple beams. Hard techno, far too loud to hear anyone’s name.',
      'Somewhere in this crowd, a first impression is about to go very wrong.',
    ],
    steps: [
      {
        kind: 'quiz', id: 'crowd', cue: 'crowd', question: 'Who was there that night?',
        options: [
          { text: 'Only Hana and Tian', response: 'That is one version of events. The Echo remembers a lot more elbows.' },
          { text: 'Maj, Tilen and a few friends', correct: true, response: 'Right. Hana came as Maj’s sister, Tilen tagged along, and Tian brought his friends. Nobody brought a plan.' },
          { text: 'Three cats in a trench coat', response: 'Suspicious answer. Although it would explain the dancing.' },
          { text: 'The entire Evervale village choir', response: 'They were not invited. They are still upset about it.' },
        ],
      },
      {
        kind: 'quiz', id: 'impression', cue: 'cigarette', question: 'What happened during the world’s most questionable first impression?',
        options: [
          { text: 'A polite handshake and a normal conversation', response: 'At a hard techno night? The Echo seems unconvinced.' },
          { text: 'An epic dance battle', response: 'The Echo wishes. Nobody won, least of all the audience.' },
          { text: 'Hana accidentally touched Tian’s left cheek with a lit cigarette', correct: true, response: 'Tsss. Left cheek, direct hit. The Echo winces on his behalf.' },
          { text: 'Tian spilled a drink on Hana', response: 'Close, but the damage went the other way.' },
        ],
      },
    ],
    completion: ['Some people bring flowers. Apparently we went with mild facial burns.'],
    reflection: 'That was… oddly specific. Aren’t Echoes supposed to be ancient Evervale magic?',
    reward: 'echo-glowstick',
  },
  {
    id: 'break',
    numeral: 'II',
    title: 'Five Minutes Until Break',
    setting: 'split',
    site: { x: 265, y: 510, name: 'the string telephone' },
    intro: [
      'Summer. Two jobs, two clocks, one very long wait.',
      'Hana has just started at GEN-I. Tian is at the warehouse, counting boxes and minutes.',
      'The memory is in pieces. Put the day back together.',
    ],
    steps: [
      {
        kind: 'match', id: 'day', prompt: 'Match each piece of the day.',
        pairs: [
          { left: 'Hana', right: 'The GEN-I office', cue: 'office' },
          { left: 'Tian', right: 'The warehouse', cue: 'warehouse' },
          { left: 'Every break', right: 'A phone call', cue: 'phones' },
          { left: 'The plan', right: 'The sea', cue: 'sea' },
        ],
        misses: ['Bold career change. The Echo seems unconvinced.', 'Those two have never met.', 'That is one version of events.', 'Suspicious answer.', 'The Echo tilts its head. Try another piece.'],
        solved: 'An office, a warehouse, two phones and one plan. Every day, the same five minutes.',
      },
      {
        kind: 'quiz', id: 'waiting', cue: 'sea-glow', question: 'What were we waiting for more than anything?',
        options: [
          { text: 'The shift to end', response: 'True, but not the whole truth.' },
          { text: 'Tian’s famous warehouse lunch', response: 'He usually cooks, but not at the warehouse. Suspicious answer.' },
          { text: 'Going to the sea together', correct: true, response: 'Yes. Every call found its way back to the sea.' },
          { text: 'Five more minutes of meetings', response: 'Nobody in history has waited for that.' },
        ],
      },
    ],
    completion: ['Five minutes until break. Then the phone, every single day.', 'Even at work, we still wanted to talk.'],
    reflection: 'GEN-I. The warehouse. Our break calls. How does a magic meadow know my work schedule?',
    reward: 'echo-phone-charm',
  },
  {
    id: 'half-bed',
    numeral: 'III',
    title: 'Half a Bed',
    setting: 'camper',
    site: { x: 820, y: 125, name: 'the starlit knoll' },
    intro: [
      'Salt air. Cicadas. Banjole, with Tian’s parents parked just across the way.',
      'The first sea holiday together: a camper van, one bed and two phones glowing in the dark.',
    ],
    steps: [
      {
        kind: 'quiz', id: 'game', cue: 'game', question: 'What game were we playing?',
        options: [
          { text: 'Minecraft', response: 'Good guess. Wrong holiday.' },
          { text: 'Chess, like responsible adults', response: 'That is one version of events.' },
          { text: 'Brawl Stars', correct: true, response: 'Yes. One more match. Then another one. Then definitely the last one.' },
          { text: 'Fortnite', response: 'On a camper-van phone? Suspicious answer.' },
        ],
      },
      {
        kind: 'quiz', id: 'spill', cue: 'wet-bed', question: 'What did we spill on the bed?',
        options: [
          { text: 'Coffee', response: 'Fortunately not. The Echo shudders.' },
          { text: 'Tian’s secret pasta sauce', response: 'He usually cooks, but never in bed. Probably.' },
          { text: 'Absolutely nothing, we were very careful', response: 'The Echo is laughing now.' },
          { text: 'Water', correct: true, response: 'Splash. Half the mattress, gone. Scoot over, Baber.' },
        ],
      },
    ],
    completion: ['A camper van. One wet bed. Half a mattress was apparently enough.'],
    reflection: 'Wait. That was Banjole. That was our camper van. These aren’t Evervale’s memories — they’re ours. …So who has been collecting them?',
    reward: 'echo-seashell',
  },
  {
    id: 'cuisine',
    numeral: 'IV',
    title: 'Improvised Cuisine',
    setting: 'flat',
    site: { x: 1600, y: 560, name: 'the seaside picnic' },
    intro: [
      'Salt air again, but no camper van this time. A little rented flat by the sea, and nobody else.',
      'Your first holiday alone. What could possibly go wrong in a kitchen this small?',
    ],
    steps: [
      {
        kind: 'reconstruct', id: 'fragments', cue: 'room',
        intro: 'The memory has broken into pieces. Drag each fragment back into its place.',
        fragments: ['Sea breeze', 'A tiny kitchen', 'Two phones', 'Just us'],
        misses: ['That piece belongs somewhere else.', 'The Echo tilts its head. Wrong spot.', 'Close. The sea disagrees.'],
        solved: 'A rented flat by the sea. Just the two of you, finally.',
      },
      {
        kind: 'play', id: 'holiday', game: 'holiday-map', cue: 'map',
        intro: 'Every day had a shape. Put each part of the holiday where it happened.',
        solved: 'Walks every day, the game on every corner, and dinner in a kitchen built for one person.',
      },
      {
        kind: 'play', id: 'creatures', game: 'creature-catch', cue: 'phones',
        intro: 'Evening walk. Both phones buzz at once: something rare is nearby.',
        solved: 'Three catches, several thousand steps and one very confused seagull.',
      },
      {
        kind: 'play', id: 'tray', game: 'foil-tray', cue: 'dinner',
        intro: 'We want lasagne. We do not own the correct tray. We do own a lot of aluminium foil.',
        solved: 'It held. Mostly. Then came tacos, the lasagne, and the special cookies.',
      },
    ],
    completion: ['Walks every day, creatures on every corner, and a lasagne tray made of pure optimism.', 'The first holiday alone was chaos. Affectionate, delicious chaos.'],
    reflection: 'The foil tray. Nobody else knows about the foil tray! Whoever is gathering these was paying very close attention.',
    reward: 'echo-foil-tray',
  },
  {
    id: 'first-winter',
    numeral: 'V',
    title: 'Cards, Snow, and Orehi',
    setting: 'winter',
    site: { x: 470, y: 930, name: 'the frosted hollow' },
    intro: [
      'Cold air, pine needles and the smell of something baking. Your first winter together.',
      'It starts on Christmas Eve, with two little packs of cards.',
    ],
    steps: [
      {
        kind: 'play', id: 'cards', game: 'card-pack', backdrop: 'eve', cue: 'binder',
        intro: 'Christmas Eve. You each bought a pack for the other. Open yours.',
        solved: 'Christmas Eve, birthdays and a few “just because” days. The collection kept growing.',
      },
      {
        kind: 'play', id: 'snowball', game: 'snowball', backdrop: 'snow', cue: 'snow-angels',
        intro: 'Evening. Fresh snow outside, Maj is already armed, and nobody is safe.',
        solved: 'Nobody won. Everybody ended up flat on their back in the snow anyway.',
      },
      {
        kind: 'play', id: 'orehi', game: 'orehi', backdrop: 'kitchen', cue: 'orehi-plate',
        intro: 'Back inside with red cheeks and wet socks. Time for orehi with Nutella.',
        solved: 'Little walnut cookies with Nutella in the middle, gone far too quickly.',
      },
    ],
    completion: ['Cards on Christmas Eve, snow down everyone’s collar, and orehi with Nutella.', 'The first winter was warm in all the ways that mattered.'],
    reflection: 'Our cards. Maj face-down in the snow. The orehi. Every Echo has been us. Whoever is collecting them knows us very, very well.',
    reward: 'echo-banca-card',
  },
  {
    id: 'future',
    numeral: 'VI',
    title: 'Not Yet',
    setting: 'future',
    site: { x: 900, y: 548, name: 'the light beside Sunmeadow Stable' },
    memoryDate: 'MEMORY DATE: UNKNOWN',
    prelude: ['MEMORY DATE: UNKNOWN', 'This memory has not happened yet.'],
    intro: [
      'Every Echo so far has pulled you back into something that already happened.',
      'This one hesitates. Then it shows you somewhere you have never been: warm, a little messy, and oddly familiar.',
    ],
    steps: [
      {
        kind: 'reconstruct', id: 'blur', cue: 'room',
        intro: 'The memory is blurry. It hasn’t happened yet, so the pieces aren’t sure where they go.',
        fragments: ['Our couch', 'Something cooking', 'Five cats', 'One good dog'],
        misses: ['That piece belongs somewhere else.', 'Not there. The future is a little particular.', 'Close. The cats disagree.'],
        solved: 'A living room, a kitchen that smells of garlic, and a lot of animals. It looks like home.',
      },
      {
        kind: 'play', id: 'home', game: 'future-home',
        intro: 'Nobody here is in a hurry. Look around, and click anything that feels like home.',
        solved: 'Dinner on the stove, something on the TV and every single animal. A normal evening. A very good one.',
      },
      {
        kind: 'quiz', id: 'cats', open: true, cue: 'cats', question: 'How many cats are too many?',
        options: [
          { text: '1', response: 'Nomi agrees, as long as the one is her. The other four have filed a complaint.' },
          { text: '3', response: 'Three. Miki counted himself twice and got to five anyway.' },
          { text: '5', response: 'Five. Exactly the current number. What a coincidence.' },
          { text: 'There is no such number', response: 'Correct, even though nothing here is wrong. The cats have been informed. Bolt would like it noted that he is not a cat.' },
        ],
      },
      {
        kind: 'quiz', id: 'evening', open: true, cue: 'evening', question: 'What do we do on a quiet evening?',
        options: [
          { text: 'Play games', response: 'Squad up. Someone lands in the worst possible spot. It is Tian. It is always Tian.' },
          { text: 'Watch anime', response: 'One episode. Then “just one more”. Then it is somehow two in the morning.' },
          { text: 'Annoy the cats', response: 'Nomi has been annoyed. Nomi will remember this.' },
          { text: 'All of the above', response: 'Games, then anime, then the cats get annoyed, then dinner. Tian is cooking. Obviously.' },
        ],
      },
      {
        kind: 'quiz', id: 'forever', open: true, cue: 'unfinished', question: 'How long does this memory last?',
        options: [{ text: 'One evening' }, { text: 'A few years' }, { text: 'Forever' }, { text: 'Until the cats want dinner' }],
      },
    ],
    completion: ['There isn’t a correct answer yet.', 'We still have to make this one.'],
    reflection: '…Wait. The cats, the horse, the foil tray, the orehi. Tian. Did you make an entire game just to say happy birthday?',
    reward: 'echo-spare-key',
    gifts: ['echo-tack', 'cat-bed'],
    finale: true,
  },
];

export const echoTotal = echoes.length;

export function isEchoId(value: unknown): value is EchoId {
  return echoes.some(({ id }) => id === value);
}

export function getEcho(id: string): EchoDefinition {
  const echo = echoes.find((candidate) => candidate.id === id);
  if (!echo) throw new Error(`Unknown Echo: ${id}`);
  return echo;
}
