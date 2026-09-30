import type { MinigameId } from '../data/echoes';
import { cardPackGame } from './CardPack';
import { creatureCatchGame } from './CreatureCatch';
import { foilTrayGame } from './FoilTray';
import { futureHomeGame } from './FutureHome';
import { holidayMapGame } from './HolidayMap';
import type { Minigame } from './Minigame';
import { orehiGame } from './Orehi';
import { snowballGame } from './Snowball';

export const minigames: Record<MinigameId, Minigame> = {
  'holiday-map': holidayMapGame,
  'creature-catch': creatureCatchGame,
  'foil-tray': foilTrayGame,
  'card-pack': cardPackGame,
  snowball: snowballGame,
  orehi: orehiGame,
  'future-home': futureHomeGame,
};
