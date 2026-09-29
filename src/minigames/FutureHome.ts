import Phaser from 'phaser';
import { futureHome, type FutureSpot } from '../data/echoGames';
import { tone } from '../systems/tones';
import { burst, canvasButton, createLayer, FONT, GameScope, type Minigame } from './Minigame';

/**
 * Echo VI: look around the future apartment. The room is drawn by the stage; this game only adds
 * click areas and asks the stage to play each reaction. Every animal found, or the way-on button, ends it.
 */
export const futureHomeGame: Minigame = (context) => {
  const { scene, calm } = context;
  const layer = createLayer(scene);
  const scope = new GameScope(scene, layer);
  const found = new Set<string>();
  const animals: readonly FutureSpot[] = futureHome.spots.filter(spot => 'animal' in spot);
  let fled = false;
  let finished = false;
  let moveOn: Phaser.GameObjects.Container | null = null;

  const animalsFound = (): number => animals.filter(spot => found.has(spot.id)).length;
  const updateHint = (): void => {
    context.hint(`${moveOn ? futureHome.hintReady : futureHome.hint}  ·  Animals ${animalsFound()}/${animals.length}`);
  };
  const finish = (): void => {
    if (finished) return;
    finished = true;
    context.hint('');
    context.done();
  };

  for (const spot of futureHome.spots as readonly FutureSpot[]) {
    // A small visible star marks each unexplored thing; the room itself is bright, so a glow would vanish.
    const sparkle = scene.add.text(spot.x + spot.width / 2 - 6, spot.y - spot.height / 2 + 4, '✦', {
      fontFamily: FONT, fontSize: '14px', color: '#5de0cc', stroke: '#1d1a22', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0.6);
    const zone = scene.add.zone(spot.x, spot.y, spot.width, spot.height).setName(`spot-${spot.id}`)
      .setInteractive({ useHandCursor: true });
    if (!calm) scene.tweens.add({ targets: sparkle, alpha: 1, scale: 1.25, duration: 900 + (spot.x % 5) * 140, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    zone.on('pointerover', () => { if (!found.has(spot.id)) sparkle.setColor('#fff0d1'); });
    zone.on('pointerout', () => { if (!found.has(spot.id)) sparkle.setColor('#5de0cc'); });
    zone.on('pointerdown', () => {
      if (finished) return;
      if (spot.flee && !fled) {
        fled = true;
        context.cue(`${spot.id}-flee`);
        context.say(spot.flee.caption);
        tone(scene, 300, 0.12, 'triangle');
        zone.setPosition(spot.flee.x, spot.flee.y);
        sparkle.setPosition(spot.flee.x + spot.width / 2 - 6, spot.flee.y - spot.height / 2 + 4);
        return;
      }
      context.cue(spot.id);
      const caption = spot.id === 'picture'
        ? (context.horseName === 'Sky' ? futureHome.skyCaption : spot.caption.replace('{horse}', context.horseName))
        : spot.caption;
      context.say(caption);
      if (found.has(spot.id)) return;
      found.add(spot.id);
      scene.tweens.killTweensOf(sparkle);
      sparkle.setVisible(false);
      burst(scene, zone.x, zone.y, 0xbff8ec, 8, 90);
      tone(scene, 480 + found.size * 30, 0.18);
      if (!moveOn && found.size >= futureHome.enough) {
        // Top right, clear of the hint line and the caption toasts.
        moveOn = canvasButton(scene, 830, 38, futureHome.moveOn, 'move-on', finish);
        layer.add(moveOn);
      }
      updateHint();
      if (animalsFound() === animals.length) {
        scope.after(1400, () => { context.say(futureHome.everyone); finish(); });
      }
    });
    layer.add([sparkle, zone]);
  }
  updateHint();

  return { destroy: () => scope.dispose() };
};
