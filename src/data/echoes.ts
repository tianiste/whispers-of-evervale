import type { ItemId } from './items';

// Adding an Echo: define it here, add a stage for its setting in src/art/EchoStages.ts,
// a site look in src/art/EchoSites.ts, and an `echo` objective in src/data/story.ts.
export type EchoId = 'spark' | 'break' | 'half-bed';
export type EchoSetting = 'club' | 'split' | 'camper';

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

export type EchoStep = QuizStep | MatchStep;

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
];

/** Next batch. The journal counts them so the mystery reads as unfinished. */
export const plannedEchoes = [
  { numeral: 'IV', working: 'First holiday alone', motifs: ['Pokémon GO', 'tacos', 'aluminium-foil lasagne tray'] },
  { numeral: 'V', working: 'Cards and snow', motifs: ['cards', 'snow', 'orehi with Nutella'] },
  { numeral: 'VI', working: 'The future memory', motifs: ['future apartment', 'cats', 'Bolt', 'birthday reveal'] },
] as const;

export const echoTotal = echoes.length + plannedEchoes.length;

export function isEchoId(value: unknown): value is EchoId {
  return echoes.some(({ id }) => id === value);
}

export function getEcho(id: string): EchoDefinition {
  const echo = echoes.find((candidate) => candidate.id === id);
  if (!echo) throw new Error(`Unknown Echo: ${id}`);
  return echo;
}
