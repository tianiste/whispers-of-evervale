// Test hooks: ingredient-0..3, mold-0..5, bake-marker, bake-zone, bake-stop, shell-0..5
import Phaser from 'phaser';
import { cue } from '../systems/audio';
import { orehi } from '../data/echoGames';
import { tone } from '../systems/tones';
import { burst, canvasButton, createLayer, floatText, GameScope, glow, text, HEIGHT, WIDTH, type Minigame } from './Minigame';

const BOWL = { x: 480, y: 410 };
const COUNTER_TOP = HEIGHT - 160;
const MOUND_COLORS = [0xffffff, 0xfef6df, 0xf7e6a8, 0xe9cf8e, 0xdcb87f];
const INGREDIENT_OFFSETS = [-370, -240, 170, 290];
const MOLD_OFFSETS_X = [-150, 0, 150];
const MOLD_OFFSETS_Y = [-45, 45];
const SHELL_OFFSETS_X = [-110, 0, 110];
const SHELL_OFFSETS_Y = [-35, 35];
const SHELL_CENTER = { x: 360, y: 430 };

export const orehiGame: Minigame = (context) => {
  const { scene, calm } = context;
  const layer = createLayer(scene);
  const scope = new GameScope(scene, layer);

  let doneCalled = false;
  let bowlGroup: Phaser.GameObjects.Container;
  let mound: Phaser.GameObjects.Graphics;
  let plateBg: Phaser.GameObjects.Rectangle;
  let ovenWindow: Phaser.GameObjects.Rectangle;
  let ovenGlowImg: Phaser.GameObjects.Image;
  const molds: Phaser.GameObjects.Container[] = [];
  const shells: Phaser.GameObjects.Container[] = [];

  function ingredientShapes(kind: number): Phaser.GameObjects.GameObject[] {
    if (kind === 0) {
      return [
        scene.add.rectangle(0, 4, 38, 48, 0xf1e6cc).setStrokeStyle(2, 0xcaa96a),
        scene.add.rectangle(0, -20, 24, 12, 0xe4d3ac).setStrokeStyle(2, 0xcaa96a),
        scene.add.rectangle(0, 0, 28, 2, 0xd8c19a),
      ];
    }
    if (kind === 1) {
      return [
        scene.add.rectangle(0, 6, 46, 26, 0xf5e18c).setStrokeStyle(2, 0xd8c05a),
        scene.add.rectangle(-16, 6, 4, 26, 0xfff6c8),
        scene.add.rectangle(16, 6, 4, 26, 0xfff6c8),
      ];
    }
    if (kind === 2) {
      return [
        scene.add.rectangle(0, 8, 34, 44, 0xe7edef, 0.85).setStrokeStyle(2, 0xb9c4c8),
        scene.add.rectangle(0, -18, 26, 10, 0x9aa3ad),
        scene.add.circle(-6, 10, 2, 0xffffff, 0.9),
        scene.add.circle(4, 18, 2, 0xffffff, 0.9),
        scene.add.circle(8, 2, 2, 0xffffff, 0.9),
      ];
    }
    return [
      scene.add.ellipse(0, 8, 32, 42, 0xfff8ec).setStrokeStyle(1, 0xe0d6bc),
      scene.add.ellipse(-6, -2, 10, 14, 0xffffff, 0.7),
    ];
  }

  function drawWalnutHalf(g: Phaser.GameObjects.Graphics, color: number): void {
    g.clear();
    g.fillStyle(color, 1).fillEllipse(0, 0, 68, 44);
    const dark = Phaser.Display.Color.IntegerToColor(color).darken(18).color;
    g.lineStyle(2, dark, 0.8);
    g.lineBetween(-26, 0, 26, 0);
    g.lineBetween(-14, -9, -7, 9);
    g.lineBetween(0, -11, 5, 11);
    g.lineBetween(15, -9, 9, 9);
  }

  function buildNutellaJar(x: number, y: number): Phaser.GameObjects.Container {
    const glass = scene.add.rectangle(0, 10, 70, 90, 0x3a2416, 0.9).setStrokeStyle(2, 0x241608);
    const lid = scene.add.rectangle(0, -38, 76, 20, 0xf4efe6).setStrokeStyle(2, 0xd8d0c0);
    const labelBg = scene.add.rectangle(0, 16, 54, 46, 0xf4ecd8).setStrokeStyle(1, 0xd8c9a8);
    const heart = scene.add.graphics();
    heart.fillStyle(0xd8607a, 1).fillCircle(-5, 12, 5).fillCircle(5, 12, 5).fillTriangle(-9.5, 15, 9.5, 15, 0, 26);
    return scene.add.container(x, y, [glass, lid, labelBg, heart]).setSize(76, 130);
  }

  function buildBackdrop(): void {
    layer.add(scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x1a130f));
    const tileGfx = scene.add.graphics();
    tileGfx.fillStyle(0x7a5a42, 1).fillRect(0, 0, WIDTH, COUNTER_TOP);
    tileGfx.lineStyle(1, 0x624634, 0.6);
    for (let x = 0; x <= WIDTH; x += 48) tileGfx.lineBetween(x, 0, x, COUNTER_TOP);
    for (let y = 0; y <= COUNTER_TOP; y += 48) tileGfx.lineBetween(0, y, WIDTH, y);
    layer.add(tileGfx);

    const winX = 70, winY = 60, winW = 200, winH = 180;
    layer.add(scene.add.rectangle(winX + winW / 2, winY + winH / 2, winW + 14, winH + 14, 0xd8c9a8).setStrokeStyle(3, 0x8a6a4a));
    layer.add(scene.add.rectangle(winX + winW / 2, winY + winH / 2, winW, winH, 0x0a1330));
    const mullion = scene.add.graphics().lineStyle(4, 0xd8c9a8);
    mullion.lineBetween(winX + winW / 2, winY, winX + winW / 2, winY + winH);
    mullion.lineBetween(winX, winY + winH / 2, winX + winW, winY + winH / 2);
    layer.add(mullion);
    for (let i = 0; i < 12; i++) {
      const flake = scene.add.circle(winX + 10 + Math.random() * (winW - 20), winY + Math.random() * winH, 2, 0xffffff, 0.85);
      layer.add(flake);
      scene.tweens.add({
        targets: flake, y: winY + winH - 4, duration: 2600 + Math.random() * 1800, repeat: -1, delay: i * 220,
        onRepeat: () => flake.setY(winY).setX(winX + 10 + Math.random() * (winW - 20)),
      });
    }

    layer.add(scene.add.rectangle(WIDTH / 2, COUNTER_TOP + 80, WIDTH, 160, 0x6e4a32));
    layer.add(scene.add.rectangle(WIDTH / 2, COUNTER_TOP + 3, WIDTH, 6, 0x53381f));
    const plankGfx = scene.add.graphics().lineStyle(1, 0x5c3d26, 0.6);
    for (let y = COUNTER_TOP + 20; y < HEIGHT; y += 26) plankGfx.lineBetween(0, y, WIDTH, y);
    layer.add(plankGfx);

    layer.add(scene.add.rectangle(880, 420, 160, 280, 0x2c2a2e).setStrokeStyle(3, 0x1a1820));
    layer.add(scene.add.rectangle(880, 440, 130, 190, 0x201e22).setStrokeStyle(2, 0x141216));
    ovenWindow = scene.add.rectangle(880, 400, 78, 60, 0x14100f).setStrokeStyle(3, 0x0d0b0a);
    layer.add(ovenWindow);
    ovenGlowImg = glow(scene, 880, 400, 0xffb457, 1.6, 0.15);
    layer.add(ovenGlowImg);
    layer.add(scene.add.circle(850, 500, 8, 0x3a3840).setStrokeStyle(1, 0x1a1820));
    layer.add(scene.add.circle(910, 500, 8, 0x3a3840).setStrokeStyle(1, 0x1a1820));

    layer.add(glow(scene, 480, 40, 0xffcf8a, 3, 0.18));
  }

  function igniteOven(): void {
    ovenWindow.setFillStyle(0xffb457, 1);
    scene.tweens.add({ targets: ovenGlowImg, alpha: { from: 0.35, to: calm ? 0.5 : 0.7 }, duration: 700, yoyo: true, repeat: -1 });
  }

  function updateMound(count: number): void {
    mound.clear();
    const color = MOUND_COLORS[count]!;
    const radius = 24 + count * 9;
    mound.fillStyle(color, 0.95).fillEllipse(0, -6, radius * 1.3, radius);
  }

  function startPrepare(): void {
    context.hint(orehi.hints.prepare);
    bowlGroup = scene.add.container(BOWL.x, BOWL.y);
    const bowlRim = scene.add.ellipse(0, 0, 170, 70, 0x9aa3ad).setStrokeStyle(3, 0x6d747c);
    const bowlInner = scene.add.ellipse(0, -6, 150, 54, 0x50575e);
    mound = scene.add.graphics();
    bowlGroup.add([bowlRim, bowlInner, mound]);
    layer.add(bowlGroup);

    let mixedCount = 0;
    orehi.ingredients.forEach((name, i) => {
      const startX = BOWL.x + INGREDIENT_OFFSETS[i]!;
      const startY = 440;
      const shapes = ingredientShapes(i);
      const label = text(scene, 0, 34, name, 12, '#f4e9cf');
      const item = scene.add.container(startX, startY, [...shapes, label]).setSize(56, 76).setName(`ingredient-${i}`);
      item.setInteractive({ useHandCursor: true });
      item.on('pointerdown', () => {
        item.disableInteractive();
        const start = { x: item.x, y: item.y };
        scene.tweens.addCounter({
          from: 0, to: 1, duration: 480, ease: 'Sine.In',
          onUpdate: tween => {
            const t = tween.getValue() ?? 0;
            item.setPosition(
              start.x + (BOWL.x - start.x) * t,
              start.y + (BOWL.y - start.y) * t - Math.sin(Math.PI * t) * 80,
            );
            item.setScale(1 - 0.3 * t);
          },
          onComplete: () => {
            item.destroy();
            burst(scene, BOWL.x, BOWL.y - 10, 0xfff3d6, 10, 90);
            cue(scene, 'cook');
            mixedCount++;
            updateMound(mixedCount);
            if (mixedCount === orehi.ingredients.length) scope.after(350, stirAndAdvance);
          },
        });
      });
      layer.add(item);
    });
  }

  function stirAndAdvance(): void {
    scene.tweens.add({
      targets: bowlGroup,
      scaleX: { from: 1, to: calm ? 1.03 : 1.08 },
      scaleY: { from: 1, to: calm ? 0.98 : 0.92 },
      duration: 90, yoyo: true, repeat: 5, ease: 'Sine.InOut',
      onComplete: () => {
        bowlGroup.setScale(1);
        mound.clear().fillStyle(0xd8b384, 1).fillCircle(0, -10, 46).lineStyle(2, 0xb8905c, 0.8).strokeCircle(0, -10, 46);
        cue(scene, 'dough');
        scope.after(400, startShape);
      },
    });
  }

  function startShape(): void {
    context.hint(orehi.hints.shape);
    scene.tweens.add({ targets: bowlGroup, x: bowlGroup.x + 260, alpha: 0, duration: 500, ease: 'Sine.In', onComplete: () => bowlGroup.destroy() });
    scope.after(400, buildMoldPlate);
  }

  function buildMoldPlate(): void {
    plateBg = scene.add.rectangle(480, 300, 520, 230, 0x9aa0a6).setStrokeStyle(4, 0x6d747c);
    layer.add(plateBg);
    let filled = 0;
    MOLD_OFFSETS_Y.forEach((oy, r) => {
      MOLD_OFFSETS_X.forEach((ox, c) => {
        const i = r * 3 + c;
        const x = 480 + ox, y = 300 + oy;
        const cavity = scene.add.ellipse(0, 0, 92, 60, 0x6e747a).setStrokeStyle(2, 0x50565c);
        const dough = scene.add.graphics();
        const mold = scene.add.container(x, y, [cavity, dough]).setSize(92, 60).setName(`mold-${i}`);
        mold.setInteractive({ useHandCursor: true });
        mold.on('pointerdown', () => {
          mold.disableInteractive();
          drawWalnutHalf(dough, 0xe8cd9c);
          scene.tweens.add({ targets: mold, scaleX: 1.08, scaleY: 1.08, duration: 100, yoyo: true });
          cue(scene, 'dough');
          filled++;
          if (filled === 6) scope.after(400, startBake);
        });
        layer.add(mold);
        molds.push(mold);
      });
    });
  }

  function startBake(): void {
    context.hint(orehi.hints.bake);
    const flyOut: Phaser.GameObjects.GameObject[] = [plateBg, ...molds];
    scene.tweens.add({ targets: flyOut, x: '+=260', y: '+=30', scale: 0.5, alpha: 0.25, duration: 500, ease: 'Sine.In', onComplete: () => flyOut.forEach(o => o.destroy()) });
    igniteOven();
    cue(scene, 'oven');

    const trackY = 470, trackLeft = 280, trackWidth = 400;
    const track = scene.add.rectangle(480, trackY, trackWidth, 18, 0x2a2420).setStrokeStyle(2, 0xb99b63);
    layer.add(track);
    const zoneWidth = trackWidth * 0.35;
    const zoneX = trackLeft + trackWidth * 0.45;
    const zone = scene.add.rectangle(zoneX, trackY, zoneWidth, 18, 0xffcf6b, 0.55).setOrigin(0, 0.5).setName('bake-zone');
    layer.add(zone);
    const marker = scene.add.rectangle(trackLeft, trackY, 6, 30, 0xfff3d6).setName('bake-marker');
    layer.add(marker);

    let resolved = false;
    let markerTween: Phaser.Tweens.Tween | undefined;

    const runMarker = (): void => {
      resolved = false;
      marker.setX(trackLeft);
      markerTween = scene.tweens.add({
        targets: marker, x: trackLeft + trackWidth, duration: 2400, ease: 'Linear',
        onComplete: () => { if (!resolved) missBake('late'); },
      });
    };

    const missBake = (kind: 'early' | 'late'): void => {
      resolved = true;
      context.say(kind === 'early' ? orehi.bake.tooEarly : orehi.bake.tooLate);
      cue(scene, 'error', 0.6);
      scope.after(500, runMarker);
    };

    const golden = (): void => {
      resolved = true;
      context.say(orehi.bake.golden);
      tone(scene, 660, 0.22);
      scope.after(700, () => {
        track.destroy(); zone.destroy(); marker.destroy(); stopButton.destroy();
        startFill();
      });
    };

    const stopButton = canvasButton(scene, 480, trackY + 44, 'Stop', 'bake-stop', () => {
      if (resolved) return;
      markerTween?.stop();
      if (marker.x < zone.x) missBake('early');
      else if (marker.x > zone.x + zone.width) missBake('late');
      else golden();
    });
    layer.add(stopButton);

    runMarker();
  }

  function startFill(): void {
    context.hint(orehi.hints.fill);
    layer.add(scene.add.ellipse(SHELL_CENTER.x, SHELL_CENTER.y, 360, 120, 0x8a6a52, 0.35).setStrokeStyle(2, 0x6e4a32));
    layer.add(buildNutellaJar(800, 400));

    let filled = 0;
    SHELL_OFFSETS_Y.forEach((oy, r) => {
      SHELL_OFFSETS_X.forEach((ox, c) => {
        const i = r * 3 + c;
        const x = SHELL_CENTER.x + ox, y = SHELL_CENTER.y + oy;
        const shellGfx = scene.add.graphics();
        drawWalnutHalf(shellGfx, 0xc98a4a);
        const shell = scene.add.container(x, y, [shellGfx]).setSize(76, 50).setName(`shell-${i}`);
        shell.setInteractive({ useHandCursor: true });
        shell.on('pointerdown', () => {
          shell.disableInteractive();
          const dollop = scene.add.ellipse(0, -2, 34, 20, 0x4a2c18).setStrokeStyle(1, 0x2e1a0e);
          shell.add(dollop);
          scene.tweens.add({ targets: dollop, y: dollop.y + 5, duration: 160, yoyo: true, ease: 'Sine.Out' });
          cue(scene, 'dough', 0.7);
          filled++;
          if (filled === 6) scope.after(400, pairAndFinish);
        });
        layer.add(shell);
        shells.push(shell);
      });
    });
  }

  function pairAndFinish(): void {
    context.hint('');
    const pairs: [number, number][] = [[0, 3], [1, 4], [2, 5]];
    pairs.forEach(([a, b], idx) => {
      const shellA = shells[a]!;
      const shellB = shells[b]!;
      const mid = { x: (shellA.x + shellB.x) / 2, y: (shellA.y + shellB.y) / 2 };
      scene.tweens.add({ targets: shellA, x: mid.x, y: mid.y, duration: 400, ease: 'Sine.InOut' });
      scene.tweens.add({
        targets: shellB, x: mid.x, y: mid.y, duration: 400, ease: 'Sine.InOut',
        onComplete: () => {
          burst(scene, mid.x, mid.y, 0xfff4e0, 12, 90);
          tone(scene, 540 + idx * 40, 0.2);
        },
      });
    });
    scope.after(600, () => {
      floatText(scene, SHELL_CENTER.x, SHELL_CENTER.y - 40, '~', '#f4efe6', 22);
      scope.after(150, () => floatText(scene, SHELL_CENTER.x - 20, SHELL_CENTER.y - 50, '~', '#f4efe6', 20));
      scope.after(300, () => floatText(scene, SHELL_CENTER.x + 20, SHELL_CENTER.y - 30, '~', '#f4efe6', 18));
      context.say(orehi.done);
      scope.after(1400, () => {
        if (!doneCalled) { doneCalled = true; context.done(); }
      });
    });
  }

  buildBackdrop();
  startPrepare();

  return { destroy: () => scope.dispose() };
};
