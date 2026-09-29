import Phaser from 'phaser';
import { holidayMap, type HolidayIcon } from '../data/echoGames';
import { tone } from '../systems/tones';
import { burst, createLayer, dragToSlots, GameScope, glow, text, type Minigame } from './Minigame';

// Test hooks: layer children 'activity-<i>' (drag) and 'place-<i>' (target), same index = match.
const SLOTS = [{ x: 690, y: 150 }, { x: 330, y: 120 }, { x: 390, y: 320 }, { x: 590, y: 330 }];
const INK = 0x5a4632;

function drawIcon(graphics: Phaser.GameObjects.Graphics, icon: HolidayIcon): void {
  if (icon === 'walk') {
    for (const [x, y, flip] of [[-8, 6, 1], [7, -6, -1]] as const) {
      graphics.fillStyle(0x7a5a3a).fillEllipse(x, y, 9, 14).fillCircle(x + flip * 2, y - 11, 3);
    }
  } else if (icon === 'phone') {
    graphics.fillStyle(0x2a2a34).fillRoundedRect(-9, -15, 18, 30, 3).fillStyle(0x8ff0ff).fillRect(-7, -11, 14, 20);
    graphics.fillStyle(0xffd86a).fillCircle(0, -1, 4);
  } else if (icon === 'pan') {
    graphics.fillStyle(0x3a3a44).fillCircle(-3, 2, 12).fillRect(7, -1, 14, 5).fillStyle(0xf2d98a).fillCircle(-3, 2, 8);
  } else {
    graphics.fillStyle(0xe8b44a).slice(0, 6, 15, Math.PI, 0, false).fillPath();
    graphics.fillStyle(0x6fbf5a).fillRect(-12, 2, 24, 3).fillStyle(0xd0503a).fillRect(-9, 1, 4, 2).fillRect(3, 1, 4, 2);
  }
}

/** Echo IV stage A: drag the holiday's activities onto a hand-drawn seaside map. */
export const holidayMapGame: Minigame = (context) => {
  const { scene } = context;
  const layer = createLayer(scene);
  const scope = new GameScope(scene, layer);
  layer.add(scene.add.rectangle(480, 270, 960, 540, 0x0c0a14, 0.55));
  const paper = scene.add.graphics();
  paper.fillStyle(0xe9d7ac).fillRoundedRect(170, 30, 620, 390, 14).lineStyle(4, 0x9a7b52).strokeRoundedRect(170, 30, 620, 390, 14);
  // Sea along the right, a sandy beach and the promenade along it.
  paper.fillStyle(0x7fb8d0).fillRoundedRect(740, 34, 46, 382, { tl: 0, tr: 12, bl: 0, br: 12 });
  paper.fillStyle(0x6aa6c2).fillRect(715, 34, 30, 382);
  paper.fillStyle(0xf0dca8).fillRect(690, 34, 26, 382);
  paper.lineStyle(3, INK, 0.6);
  for (let y = 44; y < 410; y += 18) paper.lineBetween(683, y, 683, y + 9);
  for (let y = 60; y < 400; y += 46) paper.lineStyle(2, 0xd8f0ff, 0.8).lineBetween(728, y, 740, y + 6);
  // Old town rooftops, the flat with its kitchen window and balcony.
  for (const [x, y] of [[270, 90], [305, 78], [345, 96], [380, 82], [300, 128]] as const) {
    paper.fillStyle(0xd8b88a).fillRect(x - 14, y - 8, 28, 22).fillStyle(0xb8554a).fillTriangle(x - 17, y - 8, x, y - 22, x + 17, y - 8);
  }
  paper.fillStyle(0xf4efe6).fillRect(430, 270, 130, 110).lineStyle(2, INK).strokeRect(430, 270, 130, 110);
  paper.fillStyle(0x7fb8d0).fillRect(445, 290, 34, 26).fillRect(512, 290, 34, 26);
  paper.fillStyle(0x9a7b52).fillRect(560, 318, 50, 6).fillRect(560, 324, 3, 26).fillRect(607, 324, 3, 26);
  paper.lineStyle(2, INK, 0.4).strokeCircle(330, 120, 70);
  layer.add(paper);
  layer.add(text(scene, 480, 50, 'OUR HOLIDAY', 16, '#5a4632').setFontStyle('bold'));
  layer.add(text(scene, 760, 400, 'the sea', 13, '#f4efe6'));

  const places = holidayMap.places;
  const slots = SLOTS.slice(0, places.length);
  slots.forEach((slot, index) => {
    const ring = scene.add.circle(slot.x, slot.y, 32, 0xfff6e0, 0.35).setStrokeStyle(3, INK, 0.7).setName(`place-${index}`);
    layer.add(ring);
    scene.tweens.add({ targets: ring, scale: 1.08, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    layer.add(text(scene, slot.x, slot.y + 46, places[index]!.place, 13, '#3d2f22').setBackgroundColor('#e9d7acdd').setPadding(4, 2, 4, 2));
  });

  const pieces = places.map(({ activity, icon }, index) => {
    const x = index % 2 ? 880 : 80;
    const y = 140 + Math.floor(index / 2) * 200 + (index % 2 ? 50 : 0);
    const disc = scene.add.circle(0, 0, 30, 0xfff6e0).setStrokeStyle(3, 0x5de0cc);
    const graphics = scene.add.graphics();
    drawIcon(graphics, icon);
    const caption = text(scene, 0, 44, activity, 13, '#fff0d1').setBackgroundColor('#1d1a22cc').setPadding(4, 2, 4, 2);
    const piece = scene.add.container(x, y, [glow(scene, 0, 0, 0x5de0cc, 0.8, 0.3), disc, graphics, caption]).setSize(70, 70).setName(`activity-${index}`);
    layer.add(piece);
    return piece;
  });

  let misses = 0;
  context.hint(holidayMap.hint);
  dragToSlots(scene, pieces, slots, {
    snap: 55,
    onPlace: (index) => {
      const slot = slots[index]!;
      pieces[index]!.list.find(child => child instanceof Phaser.GameObjects.Text)?.setVisible(false);
      burst(scene, slot.x, slot.y, 0xffe7a0);
      tone(scene, 560 + index * 80);
      if (places[index]!.icon === 'walk') {
        for (let i = 0; i < 8; i++) {
          const print = scene.add.ellipse(683 + (i % 2 ? 5 : -5), 400 - i * 44, 6, 9, INK, 0).setDepth(55);
          layer.add(print);
          scene.tweens.add({ targets: print, fillAlpha: 0.7, duration: 200, delay: i * 90 });
        }
      }
    },
    onMiss: () => { context.say(holidayMap.misses[misses++ % holidayMap.misses.length]!); tone(scene, 220, 0.16, 'triangle'); },
    onDone: () => {
      context.hint('');
      const warm = glow(scene, 480, 225, 0xffe7a0, 5, 0);
      layer.add(warm);
      scene.tweens.add({ targets: warm, alpha: 0.35, duration: 500, yoyo: true });
      [600, 750, 900].forEach((frequency, i) => scope.after(i * 110, () => tone(scene, frequency, 0.22)));
      scope.after(1300, () => context.done());
    },
  });

  return { destroy: () => scope.dispose() };
};
