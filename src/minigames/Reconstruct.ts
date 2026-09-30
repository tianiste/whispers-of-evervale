import Phaser from 'phaser';
import { cue } from '../systems/audio';
import type { ReconstructStep } from '../data/echoes';
import { tone } from '../systems/tones';
import { burst, createLayer, dragToSlots, GameScope, glow, text, type Minigame } from './Minigame';

const CENTER = { x: 480, y: 232 };
const RADIUS = 118;
const COLORS = [0x5de0cc, 0xffc861, 0xc07bff, 0x7fb8ff, 0xff9ab8, 0x9dff8a];

/** The broken memory as a disc: each labelled wedge fits one slot, then the pieces merge and glow. */
export function reconstruct(step: ReconstructStep): Minigame {
  return (context) => {
    const { scene, calm } = context;
    const layer = createLayer(scene);
    const scope = new GameScope(scene, layer);
    layer.add(scene.add.rectangle(480, 270, 960, 540, 0x07060e, 0.6));
    const count = step.fragments.length;
    const sweep = Math.PI * 2 / count;
    // Centroid of a circular sector, measured from the circle's centre.
    const centroidDistance = (2 * RADIUS * Math.sin(sweep / 2)) / (3 * (sweep / 2));
    const wedges = step.fragments.map((_, index) => {
      const start = -Math.PI / 2 + index * sweep;
      const middle = start + sweep / 2;
      const centroid = { x: Math.cos(middle) * centroidDistance, y: Math.sin(middle) * centroidDistance };
      const outline = [new Phaser.Math.Vector2(-centroid.x, -centroid.y)];
      for (let i = 0; i <= 12; i++) {
        const angle = start + sweep * i / 12;
        outline.push(new Phaser.Math.Vector2(Math.cos(angle) * RADIUS - centroid.x, Math.sin(angle) * RADIUS - centroid.y));
      }
      return { centroid, outline, color: COLORS[index % COLORS.length]! };
    });

    const halo = glow(scene, CENTER.x, CENTER.y, 0x8ffff0, 2.4, 0.2);
    layer.add(halo);
    scene.tweens.add({ targets: halo, alpha: 0.32, duration: 1400, yoyo: true, repeat: -1 });
    const slots = wedges.map(({ centroid, outline, color }, index) => {
      const x = CENTER.x + centroid.x, y = CENTER.y + centroid.y;
      layer.add(scene.add.graphics({ x, y }).fillStyle(color, 0.08).fillPoints(outline, true).lineStyle(2, color, 0.55).strokePoints(outline, true));
      layer.add(text(scene, x, y, step.fragments[index]!, 12, '#f4e9cf').setAlpha(0.45).setWordWrapWidth(70).setName(`slot-${index}`));
      return { x, y };
    });

    const pieces = wedges.map(({ outline, color }, index) => {
      const column = index % 2 ? 1 : 0;
      const row = Math.floor(index / 2);
      const x = column ? 820 : 140;
      const y = 150 + row * 170 + (column ? 40 : 0);
      const shape = scene.add.graphics().fillStyle(color, 0.9).fillPoints(outline, true).lineStyle(3, 0xfff6e0, 0.9).strokePoints(outline, true);
      const caption = text(scene, 0, 0, step.fragments[index]!, 13, '#1d1a22').setWordWrapWidth(76);
      const piece = scene.add.container(x, y, [glow(scene, 0, 0, color, 0.9, 0.35), shape, caption]).setSize(110, 110).setName(`fragment-${index}`);
      if (!calm) scene.tweens.add({ targets: piece, angle: { from: -4, to: 4 }, duration: 1600 + index * 200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      layer.add(piece);
      return piece;
    });

    let misses = 0;
    context.hint('Drag each fragment into its place in the memory.');
    dragToSlots(scene, pieces, slots, {
      snap: 70,
      onPlace: (index) => {
        scene.tweens.killTweensOf(pieces[index]!);
        pieces[index]!.setAngle(0);
        burst(scene, slots[index]!.x, slots[index]!.y, wedges[index]!.color);
        cue(scene, 'shimmer', 0.6);
      },
      onMiss: () => {
        context.say(step.misses[misses++ % step.misses.length]!);
        cue(scene, 'error', 0.5);
      },
      onDone: () => {
        context.hint('');
        const flash = glow(scene, CENTER.x, CENTER.y, 0xffffff, 0.4, 0.95);
        const ring = scene.add.circle(CENTER.x, CENTER.y, RADIUS, 0xffffff, 0).setStrokeStyle(4, 0xbff8ec);
        layer.add([flash, ring]);
        scene.tweens.add({ targets: pieces, scale: 0.96, duration: 380, yoyo: true, ease: 'Sine.InOut' });
        scene.tweens.add({ targets: flash, scale: calm ? 2 : 4, alpha: 0, duration: 900, ease: 'Sine.Out' });
        scene.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 900 });
        [520, 660, 780].forEach((frequency, i) => scope.after(i * 120, () => tone(scene, frequency, 0.25)));
        const reveal = text(scene, CENTER.x, CENTER.y + RADIUS + 44, step.fragments.join('  ·  '), 18, '#bff8ec').setAlpha(0);
        layer.add(reveal);
        scene.tweens.add({ targets: reveal, alpha: 1, duration: 500, delay: 300 });
        scope.after(1700, () => context.done());
      },
    });

    return { destroy: () => scope.dispose() };
  };
}
