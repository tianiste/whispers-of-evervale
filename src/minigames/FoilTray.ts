import Phaser from 'phaser';
import { figureKey } from '../art/EchoFigures';
import { foilTray } from '../data/echoGames';
import { tone } from '../systems/tones';
import { burst, createLayer, floatText, GameScope, glow, text, type Minigame } from './Minigame';

// Test hooks: layer children 'flap-top|bottom|left|right' (drag toward the tray centre),
// 'corner-0..3' (click; one springs back once) and 'layer-0..2' (click).
const TRAY = { x: 470, y: 318, width: 250, height: 138 };
const FLAP = 58;
const FOIL = 0xd9dee2;
const FOIL_DARK = 0x9aa3aa;

type Side = 'top' | 'bottom' | 'left' | 'right';

/** A crinkled foil polygon: jittered edges so the tray looks hand-folded. */
function crinkle(graphics: Phaser.GameObjects.Graphics, points: readonly [number, number][], jitter: number): void {
  const rough = points.map(([x, y]) => new Phaser.Math.Vector2(x + Phaser.Math.Between(-jitter, jitter), y + Phaser.Math.Between(-jitter, jitter)));
  graphics.fillStyle(FOIL).fillPoints(rough, true).lineStyle(2, FOIL_DARK).strokePoints(rough, true);
  for (let i = 0; i < 7; i++) {
    const [ax, ay] = points[i % points.length]!;
    const [bx, by] = points[(i + 2) % points.length]!;
    const t = (i + 1) / 9;
    graphics.lineStyle(1, i % 2 ? 0xffffff : FOIL_DARK, 0.7).lineBetween(ax + (bx - ax) * t, ay + (by - ay) * t, ax + (bx - ax) * t + Phaser.Math.Between(-12, 12), ay + (by - ay) * t + Phaser.Math.Between(-10, 10));
  }
}

/** Echo IV stage C: fold a lasagne tray out of aluminium foil. It will hold. Probably. */
export const foilTrayGame: Minigame = (context) => {
  const { scene, calm } = context;
  const layer = createLayer(scene);
  const scope = new GameScope(scene, layer);
  const { x: cx, y: cy, width: w, height: h } = TRAY;

  // A kitchen built for one person: tiles, a counter, the oven, a foil roll and a hopeful recipe card.
  layer.add(scene.add.rectangle(480, 150, 960, 300, 0xe8e2d4));
  for (let x = 0; x < 960; x += 40) for (let y = 0; y < 300; y += 40) layer.add(scene.add.rectangle(x + 20, y + 20, 38, 38, (x + y) % 80 ? 0xf1ece0 : 0xdfe8e6));
  layer.add(scene.add.rectangle(480, 420, 960, 240, 0xb08a5e));
  layer.add(scene.add.rectangle(480, 302, 960, 8, 0x8a6a48));
  layer.add(scene.add.rectangle(870, 330, 170, 200, 0x3a3a44).setStrokeStyle(3, 0x22222a));
  const ovenWindow = scene.add.rectangle(870, 350, 120, 80, 0x1d1a22).setStrokeStyle(2, 0x5a5a66);
  layer.add([ovenWindow, scene.add.rectangle(870, 260, 140, 10, 0x5a5a66)]);
  layer.add(scene.add.rectangle(110, 345, 150, 40, 0x6fa6c8).setStrokeStyle(2, 0x3a5a78).setAngle(-6));
  layer.add(scene.add.circle(45, 352, 17, 0xd9dee2).setStrokeStyle(2, FOIL_DARK));
  layer.add(text(scene, 115, 342, 'FOIL · 30 m', 12, '#f4efe6').setAngle(-6));
  layer.add(scene.add.rectangle(150, 150, 110, 80, 0xfff6e0).setStrokeStyle(2, 0xc8b77b).setAngle(4));
  layer.add(text(scene, 150, 136, 'LASAGNE', 14, '#5a4632').setAngle(4).setFontStyle('bold'));
  layer.add(text(scene, 152, 160, '1 tray (you\nhave none)', 11, '#8a4a3a').setAngle(4));
  const tian = scene.add.image(710, 300, figureKey('tian')).setOrigin(0.5, 1).setScale(4.2);
  layer.add(tian);
  const quip = text(scene, 710, 110, 'We could… make one?', 15, '#1d1a22').setBackgroundColor('#f4efe6').setPadding(8, 5, 8, 5);
  layer.add(quip);
  scope.after(2600, () => scene.tweens.add({ targets: quip, alpha: 0, duration: 400 }));

  const base = scene.add.graphics({ x: cx, y: cy });
  crinkle(base, [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], 2);
  layer.add(base);
  const fillings = scene.add.container(cx, cy);
  layer.add(fillings);

  // Each flap hangs off one edge; its container sits on that edge so folding scales toward the tray.
  const sides: { side: Side; x: number; y: number; points: [number, number][]; toward: { x: number; y: number } }[] = [
    { side: 'top', x: cx, y: cy - h / 2, points: [[-w / 2, 0], [w / 2, 0], [w / 2 - 14, -FLAP], [-w / 2 + 14, -FLAP]], toward: { x: 0, y: 1 } },
    { side: 'bottom', x: cx, y: cy + h / 2, points: [[-w / 2, 0], [w / 2, 0], [w / 2 - 14, FLAP], [-w / 2 + 14, FLAP]], toward: { x: 0, y: -1 } },
    { side: 'left', x: cx - w / 2, y: cy, points: [[0, -h / 2], [0, h / 2], [-FLAP, h / 2 - 14], [-FLAP, -h / 2 + 14]], toward: { x: 1, y: 0 } },
    { side: 'right', x: cx + w / 2, y: cy, points: [[0, -h / 2], [0, h / 2], [FLAP, h / 2 - 14], [FLAP, -h / 2 + 14]], toward: { x: -1, y: 0 } },
  ];
  const walls = scene.add.graphics();
  let folded = 0;
  sides.forEach(({ side, x, y, points, toward }) => {
    const shape = scene.add.graphics();
    crinkle(shape, points, 3);
    const vertical = side === 'top' || side === 'bottom';
    const reach = { x: toward.x * -FLAP / 2, y: toward.y * -FLAP / 2 };
    // Hit area centred on the flap itself, not on the edge the container sits on.
    const handle = scene.add.container(x + reach.x, y + reach.y).setSize(vertical ? w - 30 : FLAP, vertical ? FLAP : h - 30).setName(`flap-${side}`);
    shape.setPosition(-reach.x, -reach.y);
    const hint = glow(scene, 0, 0, 0xbff8ec, 0.7, 0.3);
    handle.add([hint, shape]);
    scene.tweens.add({ targets: hint, alpha: 0.6, duration: 700, yoyo: true, repeat: -1 });
    layer.add(handle);
    const home = { x: handle.x, y: handle.y };
    handle.setInteractive({ draggable: true, useHandCursor: true });
    handle.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      const pull = Math.max(0, (dragX - home.x) * toward.x + (dragY - home.y) * toward.y);
      handle.setPosition(home.x + toward.x * Math.min(pull, FLAP), home.y + toward.y * Math.min(pull, FLAP));
      shape.setScale(vertical ? 1 : 1 - Math.min(pull, FLAP) / FLAP * 0.6, vertical ? 1 - Math.min(pull, FLAP) / FLAP * 0.6 : 1);
    });
    handle.on('dragend', () => {
      const pull = (handle.x - home.x) * toward.x + (handle.y - home.y) * toward.y;
      if (pull < 26) {
        scene.tweens.add({ targets: handle, ...home, duration: 200 });
        scene.tweens.add({ targets: shape, scale: 1, duration: 200 });
        return;
      }
      handle.disableInteractive().setVisible(false);
      tone(scene, 330 + folded * 60, 0.12, 'triangle');
      // The folded flap becomes a crinkly wall along its edge.
      const x0 = x + (vertical ? -w / 2 : 0), y0 = y + (vertical ? 0 : -h / 2);
      walls.lineStyle(9, FOIL_DARK).lineBetween(x0, y0, x0 + (vertical ? w : 0), y0 + (vertical ? 0 : h));
      walls.lineStyle(4, 0xffffff, 0.8).lineBetween(x0 + toward.x * 3, y0 + toward.y * 3, x0 + (vertical ? w : 0) + toward.x * 3, y0 + (vertical ? 0 : h) + toward.y * 3);
      floatText(scene, x, y, 'crinkle', '#dfe6ea', 14);
      if (++folded === sides.length) startPinching();
    });
  });
  layer.add(walls);

  const corners = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]] as const;
  const crimps = scene.add.graphics();
  layer.add(crimps);
  const pinched = new Set<number>();
  let sprung = false;
  let springing = false;
  const redrawCrimps = (): void => {
    crimps.clear();
    for (const index of pinched) {
      const [dx, dy] = corners[index]!;
      const sx = Math.sign(dx), sy = Math.sign(dy);
      crimps.fillStyle(0xc8ced3).fillTriangle(cx + dx, cy + dy, cx + dx - sx * 18, cy + dy, cx + dx, cy + dy - sy * 18);
      crimps.lineStyle(2, 0xffffff, 0.9).lineBetween(cx + dx - sx * 4, cy + dy - sy * 12, cx + dx - sx * 12, cy + dy - sy * 4);
    }
  };
  const startPinching = (): void => {
    context.hint(foilTray.hints.pinch);
    corners.forEach(([dx, dy], index) => {
      const dot = scene.add.circle(cx + dx, cy + dy, 14, 0xbff8ec, 0.5).setStrokeStyle(2, 0xffffff).setName(`corner-${index}`);
      layer.add(dot);
      scene.tweens.add({ targets: dot, scale: 1.3, duration: 500, yoyo: true, repeat: -1 });
      dot.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (pinched.has(index)) return;
        pinched.add(index);
        dot.setVisible(false);
        redrawCrimps();
        tone(scene, 700, 0.06, 'square', 0.015);
        burst(scene, dot.x, dot.y, 0xffffff, 6, 80);
        // The first corner gives up exactly once, right after the second pinch.
        if (!sprung && pinched.size === 2) {
          sprung = true;
          springing = true;
          const first = [...pinched][0]!;
          scope.after(450, () => {
            springing = false;
            pinched.delete(first);
            redrawCrimps();
            const again = layer.getByName(`corner-${first}`) as Phaser.GameObjects.Arc | null;
            again?.setVisible(true);
            floatText(scene, cx + corners[first]![0], cy + corners[first]![1] - 16, 'boing!', '#ffd98a', 18);
            context.say(foilTray.springBack);
            tone(scene, 180, 0.2, 'triangle');
            scene.tweens.add({ targets: [base, walls, crimps, fillings], angle: { from: -2, to: 2 }, duration: 70, yoyo: true, repeat: 2, onComplete: () => [base, walls, crimps, fillings].forEach(part => part.setAngle(0)) });
          });
        }
        if (pinched.size === corners.length && !springing) scope.after(300, startLayering);
      });
    });
  };

  const startLayering = (): void => {
    context.hint(foilTray.hints.layer);
    let added = 0;
    foilTray.layers.forEach((layerInfo, index) => {
      const bowl = scene.add.container(170 + index * 100, 440).setSize(80, 70).setName(`layer-${index}`);
      bowl.add([scene.add.ellipse(0, 10, 76, 34, 0xf4efe6).setStrokeStyle(2, 0x9a8a70), scene.add.ellipse(0, 4, 60, 18, layerInfo.color), text(scene, 0, 38, layerInfo.name, 13, '#fff0d1').setBackgroundColor('#1d1a22cc').setPadding(4, 2, 4, 2)]);
      layer.add(bowl);
      bowl.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        bowl.disableInteractive().setAlpha(0.35);
        const slab = scene.add.rectangle(0, -40, w - 34, h - 34 - added * 18, layerInfo.color).setStrokeStyle(1, 0x000000, 0.15);
        fillings.add(slab);
        scene.tweens.add({ targets: slab, y: -added * 4, duration: 260, ease: 'Bounce.Out' });
        tone(scene, 260 + added * 90, 0.1, 'sine');
        if (++added === foilTray.layers.length) scope.after(500, stamp);
      });
    });
  };

  const stamp = (): void => {
    context.hint('');
    const [first, second] = foilTray.stamp;
    const card = scene.add.container(480, 190).setAngle(-6).setScale(2.4).setAlpha(0);
    card.add([
      scene.add.rectangle(0, 0, 520, 96, 0xfff6e0, 0.94).setStrokeStyle(5, 0xc0392b),
      scene.add.rectangle(0, 0, 504, 80, 0x000000, 0).setStrokeStyle(2, 0xc0392b),
      text(scene, 0, -18, first, 22, '#c0392b').setFontStyle('bold'),
      text(scene, 0, 18, second, 22, '#c0392b').setFontStyle('bold'),
    ]);
    layer.add(card);
    scene.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 170, ease: 'Back.Out', onComplete: () => {
      tone(scene, 110, 0.25, 'triangle', 0.05);
      if (!calm) scene.cameras.main.shake(140, 0.006);
      ovenWindow.setFillStyle(0xff9a4a);
      layer.add(glow(scene, 870, 350, 0xffa04a, 1.2, 0.6));
    } });
    scope.after(2600, () => context.done());
  };

  context.hint(foilTray.hints.fold);
  return { destroy: () => scope.dispose() };
};
