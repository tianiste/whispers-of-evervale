import Phaser from 'phaser';

export type FigureId = 'hana' | 'tian' | 'maj' | 'tilen' | 'friend-a' | 'friend-b' | 'crowd';

interface FigureLook {
  /** Pixels, excluding the one-pixel top margin. Hana reaches Tian's shoulders. */
  height: number;
  shoulders: number;
  skin: string;
  hair: string;
  hairLight: string;
  hairStyle: 'short' | 'long' | 'shoulder' | 'neck';
  eyes: string;
  lashes?: boolean;
  top: string;
  topShade: string;
  baggy: boolean;
  legs: string;
  shoes: string;
  grin?: boolean;
}

export const FIGURE_WIDTH = 24;
const CX = 12;

const looks: Record<FigureId, FigureLook> = {
  tian: { height: 40, shoulders: 13, skin: '#e3b28e', hair: '#5a3a22', hairLight: '#7a5232', hairStyle: 'short', eyes: '#7a8a3a', top: '#44525a', topShade: '#353f46', baggy: true, legs: '#2f3038', shoes: '#dcdcd6' },
  hana: { height: 31, shoulders: 9, skin: '#f0c8a8', hair: '#e6cc72', hairLight: '#f7e5a4', hairStyle: 'long', eyes: '#3fa39a', lashes: true, top: '#7cc7b8', topShade: '#5aa899', baggy: true, legs: '#3b3f5c', shoes: '#f4efe6' },
  maj: { height: 34, shoulders: 11, skin: '#efc3a0', hair: '#e2c56c', hairLight: '#f3dc92', hairStyle: 'shoulder', eyes: '#4a7fd0', top: '#d0654d', topShade: '#ad4f3b', baggy: false, legs: '#4a5d7a', shoes: '#2e2e34', grin: true },
  tilen: { height: 31, shoulders: 9, skin: '#e9bf9c', hair: '#18181d', hairLight: '#34343c', hairStyle: 'neck', eyes: '#3a2a20', top: '#23232b', topShade: '#18181e', baggy: false, legs: '#3a3f4a', shoes: '#18181e' },
  'friend-a': { height: 38, shoulders: 11, skin: '#dcae8a', hair: '#2e241c', hairLight: '#3e3226', hairStyle: 'short', eyes: '#3a2a20', top: '#5c4a6e', topShade: '#4a3a5a', baggy: true, legs: '#2a2a30', shoes: '#cfcfca' },
  'friend-b': { height: 37, shoulders: 11, skin: '#e6b894', hair: '#8a6a3a', hairLight: '#a0804a', hairStyle: 'short', eyes: '#3a4a6a', top: '#3e6a5a', topShade: '#30574a', baggy: false, legs: '#2a2a30', shoes: '#2a2a30' },
  crowd: { height: 36, shoulders: 11, skin: '#000', hair: '#000', hairLight: '#000', hairStyle: 'shoulder', eyes: '#000', top: '#000', topShade: '#000', baggy: true, legs: '#000', shoes: '#000' },
};

export const figureKey = (id: FigureId): string => `figure-${id}`;
export const figureHeight = (id: FigureId): number => looks[id].height + 1;

/** Front-facing memory characters, drawn once at boot; a PNG under the same key replaces them. */
export function ensureFigureTextures(scene: Phaser.Scene): void {
  for (const [id, look] of Object.entries(looks) as [FigureId, FigureLook][]) {
    if (scene.textures.exists(figureKey(id))) continue;
    const texture = scene.textures.createCanvas(figureKey(id), FIGURE_WIDTH, look.height + 1)!;
    drawFigure(texture.getContext(), look);
    texture.refresh();
  }
}

function drawFigure(ctx: CanvasRenderingContext2D, look: FigureLook): void {
  const rect = (x: number, y: number, w: number, h: number, color: string): void => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  const bottom = look.height;
  const torso = Math.round((look.height - 10) * 0.45) + (look.baggy ? 2 : 0);
  const width = look.shoulders + (look.baggy ? 2 : 0);
  const left = CX - (width - 1) / 2;
  const legWidth = look.baggy ? 4 : 3;

  const backHair = { long: Math.round(look.height * 0.55), shoulder: 13, neck: 10, short: 0 }[look.hairStyle];
  if (backHair) rect(CX - 5, 1, 11, backHair, look.hair);
  rect(CX - 4, 2, 9, 7, look.skin);
  rect(CX - 4, 1, 9, 2, look.hair);
  rect(CX - 2, 1, 4, 1, look.hairLight);
  if (look.hairStyle === 'short') {
    rect(CX - 4, 3, 1, 2, look.hair); rect(CX + 4, 3, 1, 2, look.hair); rect(CX + 1, 0, 2, 1, look.hair);
    rect(CX - 3, 3, 3, 1, look.hair);
  } else {
    rect(CX - 4, 3, 4, 1, look.hair); rect(CX + 3, 3, 2, 1, look.hair);
    rect(CX - 5, 2, 1, backHair - 1, look.hair); rect(CX + 5, 2, 1, backHair - 1, look.hair);
    rect(CX - 5, 4, 1, 3, look.hairLight);
  }
  if (look.lashes) { rect(CX - 3, 4, 2, 1, '#2a1f1f'); rect(CX + 2, 4, 2, 1, '#2a1f1f'); rect(CX - 4, 5, 1, 1, '#2a1f1f'); rect(CX + 4, 5, 1, 1, '#2a1f1f'); }
  else { rect(CX - 3, 4, 2, 1, look.hair); rect(CX + 2, 4, 2, 1, look.hair); }
  rect(CX - 2, 5, 1, 2, look.eyes); rect(CX + 2, 5, 1, 2, look.eyes);
  if (look.lashes) { rect(CX - 3, 7, 1, 1, '#f2a8a0'); rect(CX + 3, 7, 1, 1, '#f2a8a0'); }
  rect(CX - (look.grin ? 2 : 1), 7, look.grin ? 5 : 3, 1, '#b5655a');
  rect(CX - 1, 9, 3, 1, look.skin);

  rect(left - 2, 10, 2, torso - 1, look.top);
  rect(left + width, 10, 2, torso - 1, look.top);
  rect(left - 2, 9 + torso, 2, 2, look.skin);
  rect(left + width, 9 + torso, 2, 2, look.skin);
  rect(left, 10, width, torso, look.top);
  rect(left, 9 + torso, width, 1, look.topShade);
  rect(CX, 11, 1, Math.min(4, torso - 2), look.topShade);
  if (look.hairStyle === 'long') {
    rect(CX - 5, 9, 2, backHair - 8, look.hair); rect(CX + 4, 9, 2, backHair - 8, look.hair);
    rect(CX - 5, 10, 1, backHair - 11, look.hairLight);
  } else if (look.hairStyle === 'shoulder') {
    rect(CX - 5, 9, 1, 3, look.hair); rect(CX + 5, 9, 1, 3, look.hair);
  }

  const legTop = 10 + torso;
  rect(CX - legWidth, legTop, legWidth, bottom - legTop, look.legs);
  rect(CX + 1, legTop, legWidth, bottom - legTop, look.legs);
  rect(CX - legWidth - 1, bottom, legWidth + 1, 1, look.shoes);
  rect(CX + 1, bottom, legWidth + 1, 1, look.shoes);
}
