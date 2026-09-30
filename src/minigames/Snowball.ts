import Phaser from 'phaser';
import { cue } from '../systems/audio';
import { snowball } from '../data/echoGames';
import { figureKey } from '../art/EchoFigures';
import { tone } from '../systems/tones';
import { burst, createLayer, FONT, GameScope, glow, HEIGHT, text, WIDTH, type Minigame } from './Minigame';

// Test hook: the 'maj' Container (a direct child of the layer) is what the browser test clicks on.
const HIT_RADIUS = 40;

export const snowballGame: Minigame = (context) => {
  const { scene, calm } = context;
  const layer = createLayer(scene);
  const scope = new GameScope(scene, layer);
  const bg = <T extends Phaser.GameObjects.GameObject>(obj: T): T => { backdrop.add(obj); return obj; };
  const fg = <T extends Phaser.GameObjects.GameObject>(obj: T): T => { layer.add(obj); return obj; };

  const backdrop = scene.add.container(0, 0);
  layer.add(backdrop);

  [0x0a1128, 0x11205a, 0x1c2f74, 0x2c4488, 0x3d5aa0].forEach((color, i) => bg(scene.add.rectangle(WIDTH / 2, i * 78 + 39, WIDTH, 78, color)));
  bg(scene.add.rectangle(WIDTH / 2, 465, WIDTH, 150, 0xdce8f2));
  bg(scene.add.rectangle(WIDTH / 2, 392, WIDTH, 8, 0xc3d6e6));

  const mounds: { x: number; y: number }[] = [{ x: 230, y: 402 }, { x: 480, y: 416 }, { x: 730, y: 398 }];
  mounds.forEach(spot => {
    bg(scene.add.ellipse(spot.x, spot.y + 10, 150, 46, 0xc9dced, 0.9));
    bg(scene.add.ellipse(spot.x, spot.y, 140, 60, 0xf3f8fc));
  });

  for (let x = 560; x <= 900; x += 60) bg(scene.add.rectangle(x, 385, 6, 34, 0x4a3f33));
  bg(scene.add.rectangle(730, 372, 350, 6, 0x4a3f33));

  bg(scene.add.rectangle(880, 325, 8, 150, 0x2a2e36));
  bg(scene.add.rectangle(880, 248, 26, 14, 0x2a2e36));
  bg(scene.add.circle(880, 255, 10, 0xffdca0));
  bg(glow(scene, 880, 255, 0xffdca0, 3, 0.4));

  for (let i = 0; i < 36; i++) {
    const startY = -20 - Math.random() * 300;
    const flake = bg(scene.add.rectangle(Math.random() * WIDTH, startY, 2 + Math.random() * 2, 2 + Math.random() * 2, 0xffffff, 0.6 + Math.random() * 0.3));
    const duration = 4000 + Math.random() * 3000;
    scene.tweens.add({ targets: flake, y: HEIGHT + 20, duration, repeat: -1, ease: 'Linear', delay: Math.random() * duration });
  }

  const wingShapes = (): Phaser.GameObjects.GameObject[] => [
    scene.add.ellipse(0, 8, 96, 28, 0xeaf4fb, 0.6),
    scene.add.arc(-46, -4, 44, 200, 340, false, 0xeaf4fb, 0.45),
    scene.add.arc(46, -4, 44, 200, 340, true, 0xeaf4fb, 0.45),
  ];
  const moundAngels = mounds.map(spot => fg(scene.add.container(spot.x, spot.y, wingShapes()).setAlpha(0)));

  const tianX = 100, tianY = 530;
  const tianAngel = fg(scene.add.container(tianX, tianY, wingShapes()).setAlpha(0));
  const tian = fg(scene.add.image(tianX, tianY, figureKey('tian')).setOrigin(0.5, 1).setScale(5));

  let currentMoundIndex = 1;
  const start = mounds[currentMoundIndex]!;
  const majImage = scene.add.image(0, 0, figureKey('maj')).setOrigin(0.5, 1).setScale(4.5);
  // Beanie over the top of the head (texture rows 1–4 at scale 4.5).
  const beanieDome = scene.add.ellipse(0, -151, 50, 26, 0xc0392b);
  const beanieBand = scene.add.rectangle(0, -141, 50, 8, 0xf4efe6);
  const pompom = scene.add.circle(0, -165, 7, 0xffffff);
  const maj = fg(scene.add.container(start.x, start.y, [majImage, beanieDome, beanieBand, pompom]).setName('maj'));

  const reticle = fg(scene.add.container(WIDTH / 2, HEIGHT - 60, [
    scene.add.circle(0, 0, 13, 0xffffff, 0).setStrokeStyle(2, 0xffffff, 0.85),
    scene.add.rectangle(0, -18, 2, 10, 0xffffff, 0.85),
    scene.add.rectangle(0, 18, 2, 10, 0xffffff, 0.85),
    scene.add.rectangle(-18, 0, 10, 2, 0xffffff, 0.85),
    scene.add.rectangle(18, 0, 10, 2, 0xffffff, 0.85),
  ]));

  let hits = 0;
  const hitsText = fg(text(scene, 870, 26, `Hits ${hits}/${snowball.goal}`, 16));

  let finished = false;
  let doneCalled = false;
  let majLineIndex = 0;
  let hanaHitIndex = 0;
  let flightActive = false;
  let dodged = false;
  let lastWasHop = false;

  function hop(): void {
    let next = currentMoundIndex;
    while (next === currentMoundIndex) next = Phaser.Math.Between(0, mounds.length - 1);
    currentMoundIndex = next;
    const spot = mounds[currentMoundIndex]!;
    scene.tweens.add({ targets: maj, x: spot.x, y: spot.y, duration: 700, ease: 'Sine.InOut' });
    scene.tweens.add({ targets: maj, scaleY: 0.85, duration: 180, yoyo: true, repeat: 1 });
  }
  function wiggle(): void {
    const baseY = maj.y;
    scene.tweens.add({ targets: maj, y: baseY - 8, angle: 6, duration: 140, yoyo: true, repeat: 5, ease: 'Sine.InOut', onComplete: () => maj.setAngle(0) });
  }
  function tongueOut(): void {
    const tongue = scene.add.rectangle(0, -122, 8, 10, 0xff8fa8);
    maj.add(tongue);
    scope.after(500, () => tongue.destroy());
  }
  function spin(): void {
    scene.tweens.add({ targets: maj, angle: 360, duration: 480, ease: 'Cubic.InOut', onComplete: () => maj.setAngle(0) });
  }
  function peek(): void {
    const baseY = maj.y;
    scene.tweens.add({ targets: maj, y: baseY - 14, duration: 220, yoyo: true, hold: 450, ease: 'Sine.InOut' });
  }

  const majActions: (() => void)[] = [hop, wiggle, tongueOut, spin, peek];
  function scheduleMajLoop(): void {
    if (finished) return;
    const delay = lastWasHop ? Phaser.Math.Between(1900, 2400) : Phaser.Math.Between(1200, 2000);
    scope.after(delay, () => {
      if (finished) return;
      const action = majActions[Phaser.Math.Between(0, majActions.length - 1)]!;
      lastWasHop = action === hop;
      action();
      scheduleMajLoop();
    });
  }

  function speak(message: string): void {
    const bounds = maj.getBounds();
    const label = fg(scene.add.text(bounds.centerX, bounds.top - 6, message, {
      fontFamily: FONT, fontSize: '13px', color: '#1d1a22', backgroundColor: '#f4efe6', padding: { x: 7, y: 4 }, wordWrap: { width: 170 },
    }).setOrigin(0.5, 1).setScale(0.6));
    scene.tweens.add({ targets: label, scale: 1, duration: 160, ease: 'Back.Out' });
    scope.after(1600, () => scene.tweens.add({ targets: label, alpha: 0, duration: 300, onComplete: () => label.destroy() }));
  }

  function reactHit(): void {
    cue(scene, 'bonk', 0.35);
    scene.tweens.add({
      targets: maj, angle: -78, duration: 180, ease: 'Quad.Out',
      onComplete: () => scene.tweens.add({ targets: maj, angle: 0, duration: 420, delay: 240, ease: 'Back.Out' }),
    });
  }

  function startFinale(): void {
    finished = true;
    context.hint('');
    context.say(snowball.finale);
    reticle.setVisible(false);
    scene.tweens.add({ targets: maj, angle: -90, duration: 480, ease: 'Sine.Out' });
    scene.tweens.add({ targets: tian, angle: -90, duration: 480, delay: 160, ease: 'Sine.Out' });
    burst(scene, maj.x, maj.y - 50, 0xffffff, calm ? 10 : 18, calm ? 90 : 150);
    scope.after(160, () => burst(scene, tian.x, tian.y - 70, 0xffffff, calm ? 10 : 18, calm ? 90 : 150));
    scene.tweens.add({ targets: moundAngels[currentMoundIndex]!, alpha: 1, duration: 400, delay: 200 });
    scene.tweens.add({ targets: tianAngel, alpha: 1, duration: 400, delay: 360 });
    [520, 660, 780].forEach((freq, i) => scope.after(i * 120, () => tone(scene, freq, 0.3)));
    // Then Hana goes too: the view tips back into the snow.
    scope.after(650, () => {
      burst(scene, WIDTH / 2, HEIGHT - 30, 0xffffff, calm ? 12 : 26, calm ? 110 : 190);
      cue(scene, 'snow');
      fg(text(scene, WIDTH / 2, HEIGHT - 90, 'whumph!', 22, '#ffffff').setStroke('#1c2f74', 4));
      if (!calm) scene.tweens.add({ targets: backdrop, y: 40, angle: -3, duration: 420, ease: 'Quad.Out' });
    });
    scope.after(2200, () => { if (!doneCalled) { doneCalled = true; context.done(); } });
  }

  function land(point: { x: number; y: number }): void {
    if (finished) return;
    const bounds = maj.getBounds();
    const distance = Phaser.Math.Distance.Between(point.x, point.y, bounds.centerX, bounds.centerY);
    if (distance <= HIT_RADIUS) {
      hits++;
      hitsText.setText(`Hits ${hits}/${snowball.goal}`);
      cue(scene, 'snow');
      burst(scene, point.x, point.y, 0xffffff, calm ? 7 : 13, calm ? 70 : 130);
      reactHit();
      speak(snowball.majLines[majLineIndex++ % snowball.majLines.length]!);
      if (Math.random() < 0.4) scope.after(500, () => { if (!finished) wiggle(); });
      if (hits >= snowball.goal) startFinale();
    } else {
      burst(scene, point.x, point.y, 0xffffff, calm ? 4 : 7, calm ? 50 : 90);
    }
  }

  function throwSnowball(target: { x: number; y: number }): void {
    cue(scene, 'snow', 0.4);
    cue(scene, 'throw');
    const origin = { x: WIDTH / 2, y: HEIGHT - 4 };
    const control = { x: (origin.x + target.x) / 2, y: Math.min(origin.y, target.y) - 100 };
    const ball = fg(scene.add.circle(origin.x, origin.y, 11, 0xffffff).setStrokeStyle(1, 0xdfeaf5));
    scene.tweens.addCounter({
      from: 0, to: 1, duration: 420, ease: 'Sine.Out',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        const x = (1 - t) ** 2 * origin.x + 2 * (1 - t) * t * control.x + t * t * target.x;
        const y = (1 - t) ** 2 * origin.y + 2 * (1 - t) * t * control.y + t * t * target.y;
        ball.setPosition(x, y).setScale(1 - t * 0.55);
      },
      onComplete: () => { ball.destroy(); land(target); },
    });
  }

  function splatHana(): void {
    context.say(snowball.hitHana[hanaHitIndex++ % snowball.hitHana.length]!);
    cue(scene, 'snow');
    const edgeX = Math.random() < 0.5 ? 50 : WIDTH - 50;
    const edgeY = 90 + Math.random() * 280;
    const splat = fg(scene.add.circle(edgeX, edgeY, calm ? 30 : 44, 0xffffff, 0.85));
    const drip = fg(scene.add.rectangle(edgeX, edgeY + 18, 7, 0, 0xffffff, 0.8));
    scene.tweens.add({ targets: splat, scaleX: 1.3, scaleY: 0.75, duration: 200, ease: 'Sine.Out' });
    scene.tweens.add({ targets: drip, height: 54, duration: 500, delay: 150 });
    scope.after(900, () => scene.tweens.add({ targets: [splat, drip], alpha: 0, duration: 400, onComplete: () => { splat.destroy(); drip.destroy(); } }));
  }

  function duck(): void {
    if (!flightActive || dodged) return;
    dodged = true;
    context.say(snowball.ducked);
    cue(scene, 'rustle');
    if (calm) scene.tweens.add({ targets: backdrop, alpha: 0.55, duration: 130, yoyo: true });
    else scene.tweens.add({ targets: backdrop, y: 30, duration: 150, yoyo: true, ease: 'Sine.Out' });
  }

  function launchIncoming(): void {
    flightActive = true;
    dodged = false;
    const incoming = fg(scene.add.circle(WIDTH / 2, HEIGHT / 2 - 30, 90, 0xffffff, 0.85).setScale(0.04));
    scene.tweens.add({
      targets: incoming, scale: 1, alpha: 0.92, duration: 800, ease: 'Quad.In',
      onComplete: () => {
        flightActive = false;
        incoming.destroy();
        if (!dodged && !finished) splatHana();
      },
    });
  }
  function windUp(): void {
    scene.tweens.add({
      targets: maj, angle: -16, duration: 260, yoyo: true, ease: 'Sine.InOut',
      onComplete: () => { if (!finished) launchIncoming(); },
    });
  }
  function scheduleThrowBack(): void {
    if (finished) return;
    scope.after(Phaser.Math.Between(3200, 3800), () => {
      if (finished) return;
      windUp();
      scheduleThrowBack();
    });
  }

  function lobTianBall(): void {
    const origin = { x: tian.x + 14, y: tian.y - 90 };
    const target = { x: maj.x, y: maj.y - 40 };
    const control = { x: (origin.x + target.x) / 2, y: Math.min(origin.y, target.y) - 70 };
    const ball = fg(scene.add.circle(origin.x, origin.y, 6, 0xffffff));
    scene.tweens.addCounter({
      from: 0, to: 1, duration: 480, ease: 'Sine.Out',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        const x = (1 - t) ** 2 * origin.x + 2 * (1 - t) * t * control.x + t * t * target.x;
        const y = (1 - t) ** 2 * origin.y + 2 * (1 - t) * t * control.y + t * t * target.y;
        ball.setPosition(x, y);
      },
      onComplete: () => { burst(scene, ball.x, ball.y, 0xffffff, 5, 60); ball.destroy(); },
    });
  }
  function scheduleTianLob(): void {
    if (finished) return;
    scope.after(Phaser.Math.Between(4500, 7500), () => {
      if (finished) return;
      lobTianBall();
      scheduleTianLob();
    });
  }

  const onMove = (pointer: Phaser.Input.Pointer): void => { reticle.setPosition(pointer.x, pointer.y); };
  const onDown = (pointer: Phaser.Input.Pointer): void => { if (!finished) throwSnowball({ x: pointer.x, y: pointer.y }); };
  scene.input.on('pointermove', onMove);
  scene.input.on('pointerdown', onDown);

  const spaceKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  const sKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.S);
  const downKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
  const onDuckKey = (): void => duck();
  spaceKey?.on('down', onDuckKey);
  sKey?.on('down', onDuckKey);
  downKey?.on('down', onDuckKey);

  scope.onDispose(() => {
    scene.input.off('pointermove', onMove);
    scene.input.off('pointerdown', onDown);
    spaceKey?.off('down', onDuckKey);
    sKey?.off('down', onDuckKey);
    downKey?.off('down', onDuckKey);
    if (spaceKey) scene.input.keyboard?.removeKey(spaceKey, true);
    if (sKey) scene.input.keyboard?.removeKey(sKey, true);
    if (downKey) scene.input.keyboard?.removeKey(downKey, true);
  });

  context.hint(snowball.hints.throw);
  scheduleMajLoop();
  scheduleThrowBack();
  scheduleTianLob();

  return { destroy: () => scope.dispose() };
};
