import Phaser from 'phaser';
import { cue } from '../systems/audio';
import { creatureCatch, type CreatureLook } from '../data/echoGames';
import { tone } from '../systems/tones';
import { burst, createLayer, floatText, GameScope, glow, text, type Minigame } from './Minigame';

// Test hook: layer child 'creature' is the current target; click its position to throw.
const SCREEN = { x: 480, y: 262, width: 440, height: 400 };
const LAUNCH = { x: 480, y: 452 };
const CATCH_RADIUS = 44;

type Look = (typeof creatureCatch.creatures)[number];

function drawCreature(scene: Phaser.Scene, { look, body, accent }: Look): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  const eyes = (y: number, spread: number, size = 3): void => {
    g.fillStyle(0x1d1a22).fillCircle(-spread, y, size).fillCircle(spread, y, size).fillStyle(0xffffff).fillCircle(-spread + 1, y - 1, 1).fillCircle(spread + 1, y - 1, 1);
  };
  const shapes: Record<CreatureLook, () => void> = {
    gull: () => {
      g.fillStyle(body).fillCircle(0, 0, 20).fillCircle(-14, -8, 9).fillCircle(14, -8, 9);
      g.fillStyle(0x7fb8e8).fillTriangle(-6, -20, 0, -30, 6, -20);
      g.fillStyle(accent).fillTriangle(-4, 2, 4, 2, 0, 9);
      eyes(-4, 7);
    },
    bun: () => {
      g.fillStyle(body).fillEllipse(-8, -24, 9, 24).fillEllipse(8, -24, 9, 24).fillEllipse(0, 0, 38, 32);
      g.fillStyle(accent).fillEllipse(0, 6, 20, 14).fillStyle(0xf3a0a8).fillCircle(0, -1, 2);
      g.fillStyle(0xf3e6cf).fillTriangle(-6, -14, 0, -20, 6, -14);
      eyes(-5, 8);
    },
    jelly: () => {
      g.fillStyle(body, 0.9).fillEllipse(0, 0, 36, 34).fillStyle(accent, 0.8).fillCircle(-8, -8, 4).fillCircle(9, -12, 2);
      for (const x of [-12, -4, 4, 12]) g.fillStyle(body, 0.9).fillRect(x - 2, 12, 4, 8);
      g.fillStyle(0x1d1a22).fillCircle(-6, -2, 5).fillCircle(7, -2, 3).fillStyle(0xffffff).fillCircle(-5, -3, 2);
    },
  };
  shapes[look]();
  const shadow = scene.add.ellipse(0, 22, 34, 8, 0x000000, 0.25);
  return scene.add.container(0, 0, [shadow, g]).setSize(56, 56);
}

function drawOrb(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const shell = scene.add.circle(0, 0, 11, 0x3fa39a).setStrokeStyle(2, 0x1d3a36);
  const band = scene.add.rectangle(0, 0, 22, 4, 0xffd86a);
  const shine = scene.add.circle(-4, -4, 3, 0xbff8ec);
  return scene.add.container(LAUNCH.x, LAUNCH.y, [glow(scene, 0, 0, 0x8ffff0, 0.4, 0.5), shell, band, shine]).setDepth(70);
}

/** Echo IV stage B: an original creature-catching phone game on the evening promenade. */
export const creatureCatchGame: Minigame = (context) => {
  const { scene } = context;
  const layer = createLayer(scene);
  const scope = new GameScope(scene, layer);
  // Promenade at sunset, then a phone bezel framing the "camera" view.
  [0xf2a07a, 0xe88a86, 0xb07aa0, 0x6a5a8a].forEach((color, i) => layer.add(scene.add.rectangle(480, 40 + i * 50, 960, 50, color)));
  layer.add(scene.add.circle(250, 190, 34, 0xffd8a0));
  layer.add(scene.add.rectangle(480, 272, 960, 70, 0x3f7fa8));
  for (let i = 0; i < 10; i++) layer.add(scene.add.rectangle(40 + i * 100, 262 + (i % 3) * 14, 40, 2, 0xbfe6f5, 0.7));
  layer.add(scene.add.rectangle(480, 420, 960, 240, 0xcdbb9a));
  for (let x = 0; x < 960; x += 48) layer.add(scene.add.rectangle(x, 420, 2, 240, 0xb8a684));
  layer.add(scene.add.rectangle(480, 312, 960, 6, 0x5a4a5a));
  for (let x = 30; x < 960; x += 60) layer.add(scene.add.rectangle(x, 326, 4, 28, 0x5a4a5a));
  for (const x of [140, 820]) {
    layer.add(scene.add.rectangle(x, 300, 6, 150, 0x3a3440));
    layer.add(glow(scene, x, 222, 0xffd8a0, 1.1, 0.6));
  }
  const bezel = scene.add.graphics();
  bezel.fillStyle(0x07060e, 0.72);
  bezel.fillRect(0, 0, SCREEN.x - SCREEN.width / 2, 540).fillRect(SCREEN.x + SCREEN.width / 2, 0, 480, 540);
  bezel.fillRect(SCREEN.x - SCREEN.width / 2, 0, SCREEN.width, SCREEN.y - SCREEN.height / 2);
  bezel.fillRect(SCREEN.x - SCREEN.width / 2, SCREEN.y + SCREEN.height / 2, SCREEN.width, 540);
  bezel.lineStyle(14, 0x1d1a22).strokeRoundedRect(SCREEN.x - SCREEN.width / 2 - 7, SCREEN.y - SCREEN.height / 2 - 7, SCREEN.width + 14, SCREEN.height + 14, 24);
  layer.add(bezel);
  const caught = text(scene, SCREEN.x - SCREEN.width / 2 + 70, SCREEN.y - SCREEN.height / 2 + 18, '', 14, '#fff0d1').setBackgroundColor('#1d1a22aa').setPadding(6, 3, 6, 3);
  const steps = text(scene, SCREEN.x + SCREEN.width / 2 - 90, SCREEN.y - SCREEN.height / 2 + 18, '', 14, '#bff8ec').setBackgroundColor('#1d1a22aa').setPadding(6, 3, 6, 3);
  layer.add([caught, steps]);
  let stepCount = 11873;
  scope.every(260, () => steps.setText(`${creatureCatch.steps} ${(stepCount += Phaser.Math.Between(1, 3)).toLocaleString('en')}`));

  let index = 0;
  let busy = false;
  let misses = 0;
  let creature: Phaser.GameObjects.Container | null = null;
  let hopTimer: Phaser.Time.TimerEvent | null = null;
  const updateCount = (): void => { caught.setText(`Caught ${index}/${creatureCatch.goal}`); };
  const randomSpot = (): { x: number; y: number } => ({
    x: Phaser.Math.Between(SCREEN.x - SCREEN.width / 2 + 60, SCREEN.x + SCREEN.width / 2 - 60),
    y: Phaser.Math.Between(SCREEN.y - 60, SCREEN.y + SCREEN.height / 2 - 90),
  });
  const hop = (): void => {
    if (!creature || busy) return;
    const target = randomSpot();
    scene.tweens.add({ targets: creature, x: target.x, duration: 320, ease: 'Sine.InOut' });
    scene.tweens.add({ targets: creature, y: { from: creature.y, to: target.y }, duration: 320, ease: 'Sine.InOut' });
    scene.tweens.add({ targets: creature, scaleY: 0.8, duration: 90, yoyo: true });
  };
  const spawn = (): void => {
    const look = creatureCatch.creatures[index % creatureCatch.creatures.length]!;
    const spot = randomSpot();
    creature = drawCreature(scene, look).setPosition(spot.x, spot.y).setName('creature').setScale(0);
    layer.add(creature);
    scene.tweens.add({ targets: creature, scale: 1, duration: 260, ease: 'Back.Out' });
    scene.tweens.add({ targets: creature.list[1]!, y: -4, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    context.say(`Something rare nearby: ${look.name}!`);
    tone(scene, 880, 0.08); scope.after(90, () => tone(scene, 1100, 0.1));
    hopTimer?.remove(false);
    hopTimer = scope.every(2600, hop);
  };

  const onPointer = (pointer: Phaser.Input.Pointer): void => {
    if (busy || !creature || index >= creatureCatch.goal) return;
    const inside = Math.abs(pointer.x - SCREEN.x) < SCREEN.width / 2 && Math.abs(pointer.y - SCREEN.y) < SCREEN.height / 2;
    if (!inside) return;
    busy = true;
    const target = creature;
    const landing = { x: pointer.x, y: pointer.y };
    const orb = drawOrb(scene);
    layer.add(orb);
    cue(scene, 'throw');
    scene.tweens.addCounter({
      from: 0, to: 1, duration: 380, ease: 'Sine.Out',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        orb.setPosition(LAUNCH.x + (landing.x - LAUNCH.x) * t, LAUNCH.y + (landing.y - LAUNCH.y) * t - Math.sin(t * Math.PI) * 90).setScale(1 - t * 0.35).setAngle(t * 540);
      },
      onComplete: () => {
        if (Phaser.Math.Distance.Between(landing.x, landing.y, target.x, target.y) > CATCH_RADIUS) {
          scene.tweens.add({ targets: orb, y: orb.y + 30, alpha: 0, duration: 300, onComplete: () => orb.destroy() });
          if (misses++ % 2 === 0) context.say(creatureCatch.misses[Math.floor(misses / 2) % creatureCatch.misses.length]!);
          busy = false;
          hop();
          return;
        }
        // Absorbed, three suspenseful wobbles, then a catch.
        scene.tweens.add({ targets: target, scale: 0, x: orb.x, y: orb.y, duration: 220 });
        scene.tweens.add({
          targets: orb, angle: { from: -18, to: 18 }, duration: 170, yoyo: true, repeat: 2, delay: 260,
          onRepeat: () => cue(scene, 'thud', 0.45),
          onComplete: () => {
            const name = creatureCatch.creatures[index % creatureCatch.creatures.length]!.name;
            burst(scene, orb.x, orb.y, 0xffe27a, 16);
            floatText(scene, orb.x, orb.y - 20, `Caught ${name}!`, '#ffe27a', 20);
            [660, 880, 990].forEach((frequency, i) => scope.after(i * 90, () => tone(scene, frequency, 0.15)));
            target.destroy();
            creature = null;
            scene.tweens.add({ targets: orb, alpha: 0, scale: 0.4, duration: 300, delay: 300, onComplete: () => orb.destroy() });
            index++;
            updateCount();
            busy = false;
            if (index >= creatureCatch.goal) {
              hopTimer?.remove(false);
              context.hint('');
              scope.after(1300, () => context.done());
            } else scope.after(750, spawn);
          },
        });
      },
    });
  };
  scene.input.on('pointerdown', onPointer);
  scope.onDispose(() => scene.input.off('pointerdown', onPointer));

  updateCount();
  context.hint(creatureCatch.hint);
  scope.after(400, spawn);
  return { destroy: () => scope.dispose() };
};
