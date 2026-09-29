// Run `npm run dev` first, then `node scripts/verify-ui.mjs` (Node 22+, Chromium on PATH or CHROMIUM=/path/to/chrome).
// Uses an isolated browser and a test-only intercepted entrypoint; production exposes no game handle.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const url = process.env.GAME_URL ?? 'http://127.0.0.1:5173';
const shots = process.env.SHOTS_DIR ?? tmpdir();
const profile = mkdtempSync(join(tmpdir(), 'evervale-ui-'));
const browser = spawn(process.env.CHROMIUM ?? 'chromium', ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank']);
let socket;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const log = message => console.log(`· ${message}`);
try {
  const port = await new Promise((resolve, reject) => {
    browser.on('error', reject);
    browser.stderr.on('data', data => { const match = String(data).match(/DevTools listening on ws:\/\/127.0.0.1:(\d+)/); if (match) resolve(match[1]); });
    setTimeout(() => reject(Error('Chromium did not start')), 10000).unref();
  });
  const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => { socket.onopen = resolve; });
  let sequence = 0;
  const pending = new Map();
  const errors = [];
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  socket.onmessage = async ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const promise = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) promise?.reject(Error(JSON.stringify(message.error)));
      else promise?.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry.text);
    else if (message.method === 'Fetch.requestPaused') {
      const source = await (await fetch(message.params.request.url)).text();
      assert.ok(source.includes('new Phaser.Game('));
      await send('Fetch.fulfillRequest', { requestId: message.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }], body: Buffer.from(source.replace('new Phaser.Game(', 'window.__testGame = new Phaser.Game(')).toString('base64') });
    }
  };
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const waitFor = async (expression, label, attempts = 100) => {
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        if (await evaluate(expression)) return;
      } catch (error) {
        // Reload can destroy the execution context between the poll and its reply.
        if (!/Inspected target navigated|Execution context was destroyed|Cannot find context/.test(String(error))) throw error;
      }
      await wait(100);
    }
    assert.fail(`${label} · ${JSON.stringify(errors)}`);
  };
  const waitForMenu = () => waitFor(`window.__testGame?.scene.isActive('MainMenu')`, 'Main menu did not load');
  const sceneState = (scene, expression) => evaluate(`(()=>{const s=window.__testGame.scene.getScene(${JSON.stringify(scene)});return (${expression})})()`);
  const state = expression => sceneState('World', expression);
  const key = (key, type = 'keyDown') => send('Input.dispatchKeyEvent', { type, key, text: type === 'keyDown' && key === 'Enter' ? '\r' : undefined, code: key === ' ' ? 'Space' : key.length === 1 ? `Key${key.toUpperCase()}` : key, windowsVirtualKeyCode: ({ Enter: 13, Escape: 27, Tab: 9, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, ' ': 32 })[key] ?? key.toUpperCase().charCodeAt(0) });
  const press = async k => { await key(k); await wait(70); await key(k, 'keyUp'); await wait(130); };
  const click = async selector => {
    const point = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing ${selector}');e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
    await wait(120);
  };
  const text = selector => evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? ''`);
  const dialogOpen = () => evaluate('document.querySelector("dialog").open');
  const place = async (x, y, horse = false) => { await state(`s.${horse ? 'horseBody' : 'playerBody'}.reset(${x},${y})`); await wait(120); };
  const screenshot = async name => { const shot = await send('Page.captureScreenshot'); writeFileSync(join(shots, `evervale-${name}.png`), Buffer.from(shot.data, 'base64')); };
  const reload = async () => { await wait(1100); await send('Page.reload'); await waitForMenu(); await press('Enter'); await waitFor(`window.__testGame.scene.isActive('World')`, 'World after reload'); await wait(150); };

  // Canvas input in game coordinates (960×540, scaled to fit the page).
  const toPage = (x, y) => evaluate(`(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return {x:r.left+${x}*r.width/960,y:r.top+${y}*r.height/540}})()`);
  const mouse = (type, point, buttons = 0) => send('Input.dispatchMouseEvent', { type, ...point, button: buttons || type !== 'mouseMoved' ? 'left' : 'none', buttons, clickCount: type === 'mouseMoved' ? 0 : 1 });
  const tapGame = async (x, y) => { const p = await toPage(x, y); await mouse('mouseMoved', p); await mouse('mousePressed', p, 1); await wait(40); await mouse('mouseReleased', p); await wait(90); };
  const dragGame = async (from, to, steps = 12) => {
    const a = await toPage(from.x, from.y), b = await toPage(to.x, to.y);
    await mouse('mouseMoved', a); await mouse('mousePressed', a, 1); await wait(30);
    for (let i = 1; i <= steps; i++) { await mouse('mouseMoved', { x: a.x + (b.x - a.x) * i / steps, y: a.y + (b.y - a.y) * i / steps }, 1); await wait(16); }
    await mouse('mouseReleased', b); await wait(180);
  };
  /** A named object in the running Echo minigame, or null when missing or hidden. */
  const piece = name => sceneState('Echo', `(()=>{const l=s.children.getByName('minigame');const o=l&&l.getByName(${JSON.stringify(name)});if(!o||!o.visible||!o.active)return null;const b=o.getBounds();return {x:o.x,y:o.y,cx:b.centerX,cy:b.centerY,width:o.width,enabled:!!o.input?.enabled}})()`);
  const waitPiece = async (name, clickable = true) => { await waitFor(`(()=>{const l=window.__testGame.scene.getScene('Echo').children.getByName('minigame');const o=l&&l.getByName(${JSON.stringify(name)});return !!o&&o.visible&&(${!clickable}||!!o.input?.enabled)})()`, `${name} appears`); await wait(200); return piece(name); };
  const layerText = needle => sceneState('Echo', `(()=>{const find=o=>(o.text??'').includes(${JSON.stringify(needle)})||(o.list??[]).some(find);const l=s.children.getByName('minigame');return !!l&&find(l)})()`);

  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*/src/main.ts*' }] });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url }); await waitForMenu();
  await screenshot('menu'); await press('Enter'); await wait(200);
  assert.equal(await evaluate(`window.__testGame.scene.isActive('CharacterCreator')`), true);
  for (let choice = 0; choice < 3; choice++) await press('ArrowRight');
  await press('Enter'); await wait(400);
  assert.equal(await state('s.sys.isActive()'), true);
  assert.equal(await state('s.horseName'), null, 'The creator only creates Hana');
  assert.equal(await state('s.horse.display.visible'), false);
  assert.equal(await evaluate(`['riders','horses','environment-ground','cat-nomi','cat-miki','cat-viski','cat-maks','cat-maco','bolt','bolt-tail','accessory-straw-hat','accessory-flower-crown','figure-hana','figure-tian','figure-maj','figure-tilen'].every(k=>window.__testGame.textures.exists(k))`), true);
  assert.equal(await state('s.bolt.display.visible'), false, 'Bolt waits for Echo V');
  assert.equal(await state('s.echoSites.dormant.has("future") && s.birthday.every(o => !o.visible)'), true, 'The Echo VI site and birthday decorations stay hidden');
  for (const shortcut of ['i', 'o', 'h', 'j', 'Escape']) {
    await press(shortcut);
    assert.equal(await dialogOpen(), true, shortcut);
    const position = await state('[s.player.x,s.player.y]');
    await key('d'); await wait(160); await key('d', 'keyUp');
    assert.deepEqual(await state('[s.player.x,s.player.y]'), position);
    for (let n = 0; n < 8; n++) await press('Tab');
    assert.equal(await evaluate('document.querySelector("dialog").contains(document.activeElement)'), true);
    await press('Escape');
    assert.equal(await dialogOpen(), false);
  }
  await press('h'); assert.ok((await text('dialog')).includes('No horse yet')); await press('Escape');
  await key('d'); await wait(120);
  assert.ok(await state('s.playerBody.velocity.x > 150'));
  await key('d', 'keyUp'); await wait(300);
  assert.equal(await state('s.playerBody.speed'), 0);
  await place(975, 650); await press('e'); assert.equal(await state('s.mounted'), false, 'No hidden horse to mount before choosing');
  const viski = await state('[s.cats.find(c=>c.definition.id==="viski").x, s.cats.find(c=>c.definition.id==="viski").y]');
  assert.ok(Math.hypot(viski[0] - 200, viski[1] - 390) <= 60, 'Viski stays by the village hall');
  await place(viski[0], viski[1]); await press('e');
  assert.ok((await text('.reward-toast')).includes('Viski'), 'Viski can be petted');
  // Maks runs off when approached.
  const maks = await state('[s.cats.find(c=>c.definition.id==="maks").x, s.cats.find(c=>c.definition.id==="maks").y]');
  await place(maks[0] - 60, maks[1]); await wait(1600);
  assert.ok(await state(`Math.hypot(s.cats.find(c=>c.definition.id==="maks").x-${maks[0]}, s.cats.find(c=>c.definition.id==="maks").y-${maks[1]}) > 60`), 'Maks runs away');
  // Miki walks up to say hello.
  const miki = await state('[s.cats.find(c=>c.definition.id==="miki").x, s.cats.find(c=>c.definition.id==="miki").y]');
  await place(miki[0] + 180, miki[1]); await wait(3200);
  assert.ok(await state(`s.cats.find(c=>c.definition.id==="miki").x > ${miki[0] + 40}`), 'Miki approaches');

  const objectives = await evaluate(`import('/src/data/story.ts').then(module=>module.storyObjectives)`);
  const echoes = await evaluate(`import('/src/data/echoes.ts').then(module=>module.echoes)`);
  const catAt = async id => state(`(()=>{const c=s.cats.find(c=>c.definition.id===${JSON.stringify(id)});return [c.x,c.y]})()`);
  async function dismountIfNeeded() { if (await state('s.mounted')) { await place(1000, 1000, true); await press('e'); } }
  const mount = async () => {
    if (await state('s.mounted')) return;
    await place(1000, 1000, true); await place(1000, 1000); await press('e');
    assert.equal(await state('s.mounted'), true);
  };
  const worldBack = label => waitFor(`window.__testGame.scene.isActive('World') && !window.__testGame.scene.getScene('World').overlayActive && !window.__testGame.scene.isActive('Race') && !window.__testGame.scene.isActive('Groom') && !window.__testGame.scene.isActive('Echo')`, label, 150);

  // Grooming: scrub every muddy patch with real mouse drags.
  const groom = async () => {
    const [x, y] = await state('[s.horse.display.x, s.horse.display.y]');
    await place(x - 50, y); await press('h'); await click('#horse-tab'); await click('#care-brush');
    await waitFor(`window.__testGame.scene.isActive('Groom')`, 'Grooming opens');
    await wait(500); await screenshot('grooming');
    const patches = await sceneState('Groom', 's.patches.map(p=>[p.x,p.y])');
    assert.equal(patches.length, 6);
    const started = Date.now();
    for (const [px, py] of patches) {
      const centre = await toPage(px, py);
      const scale = (await toPage(1, 0)).x - (await toPage(0, 0)).x;
      await mouse('mouseMoved', centre); await mouse('mousePressed', centre, 1);
      for (let i = 0; i < 90 && await sceneState('Groom', `s.patches.find(p=>p.x===${px}&&p.y===${py}).dirt>0`); i++) {
        const angle = i / 12 * Math.PI * 2;
        await mouse('mouseMoved', { x: centre.x + Math.cos(angle) * 28 * scale, y: centre.y + Math.sin(angle) * 20 * scale }, 1);
      }
      await mouse('mouseReleased', centre);
    }
    assert.equal(await sceneState('Groom', 's.done'), true, 'All mud brushed off');
    await wait(300); await screenshot('grooming-done');
    await worldBack('Grooming returns to the world');
    log(`groomed in ${((Date.now() - started) / 1000).toFixed(1)}s of scrubbing`);
  };

  // Side-view race: countdown, jump, a forgiving bump, finish, results, optional retry.
  const race = async (trackId, { retry = false, checks = false } = {}) => {
    await dismountIfNeeded();
    await place(1005, 612); await wait(150);
    assert.equal(await text('.interaction'), 'E · Talk to the Race Steward');
    await press('e');
    assert.equal(await text('#window-title'), 'Race Steward');
    if (checks) { assert.ok(await evaluate('!!document.querySelector("#race-meadow-sprint") && !document.querySelector("#race-moonlight-derby")'), 'Locked tracks stay locked'); await screenshot('race-menu'); }
    await click(`#race-${trackId}`);
    await waitFor(`window.__testGame.scene.isActive('Race')`, 'Race scene opens');
    const run = async (first) => {
      await waitFor(`window.__testGame.scene.getScene('Race').phase === 'countdown'`, 'Countdown starts', 60);
      if (first && checks) { await wait(300); await screenshot('race-countdown'); }
      assert.equal(await sceneState('Race', 's.distance'), 0, 'No running before GO');
      await waitFor(`window.__testGame.scene.getScene('Race').phase === 'running'`, 'GO', 60);
      if (first && checks) {
        await wait(400);
        await press(' ');
        assert.ok(await sceneState('Race', 's.height > 0'), 'Space jumps');
        await wait(900);
        assert.equal(await sceneState('Race', 's.height'), 0, 'The horse lands');
        await waitFor(`window.__testGame.scene.getScene('Race').mistakes > 0`, 'Hitting an obstacle', 120);
        assert.ok(await sceneState('Race', 's.penalty >= 1000 && s.phase === "running"'), 'A bump costs time but never ends the race');
        await screenshot('race-bump');
      }
      await waitFor(`document.querySelector('dialog.race-results')?.open`, 'Race results', 600);
      assert.ok((await text('#window-title')).includes('Finished'));
      assert.ok((await text('.race-stats')).includes('Best'));
    };
    await run(true);
    await screenshot(`race-${trackId}-results`);
    if (retry) {
      await click('#race-again');
      await waitFor(`window.__testGame.scene.getScene('Race').phase !== 'finished'`, 'Retry restarts the race');
      await run(false);
    }
    await click('#race-leave');
    await worldBack('Back to Sunmeadow');
    assert.ok(await state(`s.raceBest.has(${JSON.stringify(trackId)})`));
  };

  const answerQuiz = async (step, echoId) => {
    const wrong = step.options.findIndex(o => !o.correct);
    await click(`#echo-option-${wrong}`);
    assert.equal(await text('.echo-question'), step.question, 'Wrong answers keep the question open');
    assert.equal(await text('.echo-panel .inline-feedback'), step.options[wrong].response);
    assert.ok(await evaluate(`document.querySelector('#echo-option-${wrong}').classList.contains('tried')`));
    await screenshot(`${echoId}-${step.id}-wrong`);
    await click(`#echo-option-${step.options.findIndex(o => o.correct)}`);
    await wait(250);
    assert.equal(await text('.echo-line'), step.options.find(o => o.correct).response);
  };
  const solveMatch = async (step, echoId) => {
    await click('#echo-left-0'); await click('#echo-right-1');
    assert.ok((await text('.echo-panel .inline-feedback')).length > 0, 'Mismatched pair gets feedback');
    assert.equal(await evaluate('document.querySelectorAll(".echo-match .matched").length'), 0);
    for (let i = 0; i < step.pairs.length; i++) {
      await click(`#echo-left-${i}`); await click(`#echo-right-${i}`);
      if (i === 1) await screenshot(`${echoId}-${step.id}-partial`);
    }
    assert.equal(await text('.echo-line'), step.solved);
  };

  // One driver per canvas minigame, using only mouse and keyboard input.
  const drivers = {
    async reconstruct(step) {
      const first = await waitPiece('fragment-0');
      const wrongSlot = await piece('slot-1');
      await dragGame(first, wrongSlot);
      assert.ok((await text('.reward-toast')).length > 0 && (await piece('fragment-0')).enabled, 'A wrong slot sends the fragment home');
      for (let i = 0; i < step.fragments.length; i++) { const from = await piece(`fragment-${i}`); const to = await piece(`slot-${i}`); await dragGame(from, to); }
    },
    async 'holiday-map'() {
      await waitPiece('activity-0');
      await dragGame(await piece('activity-3'), await piece('place-0'));
      for (let i = 0; i < 4; i++) await dragGame(await piece(`activity-${i}`), await piece(`place-${i}`));
    },
    async 'creature-catch'(step) {
      for (let attempt = 0; attempt < 60 && !(await text('.echo-line') === step.solved); attempt++) {
        const creature = await piece('creature');
        if (creature && creature.width) await tapGame(creature.x, creature.y);
        await wait(950);
      }
    },
    async 'foil-tray'() {
      await waitPiece('flap-top');
      const pulls = { top: [0, 60], bottom: [0, -60], left: [60, 0], right: [-60, 0] };
      for (const [side, [dx, dy]] of Object.entries(pulls)) { const flap = await piece(`flap-${side}`); await dragGame(flap, { x: flap.x + dx, y: flap.y + dy }); }
      await waitPiece('corner-0');
      let sprang = false;
      for (let round = 0; round < 8; round++) {
        let clicked = false;
        for (let i = 0; i < 4; i++) { const corner = await piece(`corner-${i}`); if (corner) { await tapGame(corner.x, corner.y); clicked = true; await wait(250); } }
        if ((await text('.reward-toast')).includes('Boing')) sprang = true;
        if (!clicked && await piece('layer-0')) break;
        await wait(500);
      }
      assert.ok(sprang, 'One corner springs back once');
      for (let i = 0; i < 3; i++) { const bowl = await waitPiece(`layer-${i}`); await tapGame(bowl.x, bowl.y); await wait(300); }
      await waitFor(`(()=>{const l=window.__testGame.scene.getScene('Echo').children.getByName('minigame');const find=o=>(o.text??'').includes('STRUCTURAL INTEGRITY')||(o.list??[]).some(find);return !!l&&find(l)})()`, 'The stamp lands');
      assert.ok(await layerText('LASAGNE COMPATIBILITY: ACCEPTABLE'));
      await wait(400); await screenshot('foil-tray-stamp');
    },
    async 'card-pack'() {
      const strip = await waitPiece('tear-strip');
      await tapGame(strip.x, strip.y + 120);
      await dragGame({ x: strip.x - strip.width / 2 + 8, y: strip.y }, { x: strip.x + strip.width / 2 - 8, y: strip.y }, 16);
      await waitPiece('card-2'); await wait(1000);
      for (let i = 0; i < 3; i++) { const card = await piece(`card-${i}`); await tapGame(card.x, card.y); await wait(450); }
      await wait(300); await screenshot('cards-flipped');
      const banca = await piece('card-2'); await tapGame(banca.x, banca.y);
    },
    async snowball(step) {
      await waitPiece('maj', false);
      for (let attempt = 0; attempt < 80 && !(await text('.echo-line') === step.solved); attempt++) {
        const maj = await piece('maj');
        if (maj) await tapGame(maj.cx, maj.cy);
        if (attempt === 3) { await press(' '); }
        if (attempt === 2) await screenshot('snowball');
        await wait(650);
      }
    },
    async 'future-home'() {
      const tap = async id => { const spot = await piece(`spot-${id}`); await tapGame(spot.cx, spot.cy); await wait(450); };
      await waitPiece('spot-nomi');
      await tap('nomi'); await tap('miki'); await tap('hana');
      await tap('maks');
      assert.ok((await text('.reward-toast')).includes('bolts'), 'Maks still runs away first');
      assert.equal(await piece('move-on'), null, 'The way on appears only after some exploring');
      await wait(400); await tap('maks');
      await tap('picture');
      assert.ok((await text('.reward-toast')).includes('Sky, framed above the couch'), 'The picture shows the horse Hana named Sky');
      assert.ok(await piece('move-on'), 'Exploring enough offers the way on');
      await screenshot('future-home');
      await tap('maco'); await tap('viski');
      await tap('bolt');
    },
    async orehi() {
      for (let i = 0; i < 4; i++) { const item = await waitPiece(`ingredient-${i}`); await tapGame(item.x, item.y); await wait(650); }
      for (let i = 0; i < 6; i++) { const mold = await waitPiece(`mold-${i}`); await tapGame(mold.x, mold.y); await wait(200); }
      const stop = await waitPiece('bake-stop');
      await tapGame(stop.x, stop.y);
      await wait(200);
      assert.ok((await text('.reward-toast')).includes('pale'), 'Stopping too early is gentle feedback');
      for (let attempt = 0; attempt < 200; attempt++) {
        const [marker, zone] = [await piece('bake-marker'), await piece('bake-zone')];
        if (!marker || !zone) break;
        if (marker.x > zone.x + 20 && marker.x < zone.x + zone.width - 20) { await tapGame(stop.x, stop.y); break; }
        await wait(40);
      }
      for (let i = 0; i < 6; i++) { const shell = await waitPiece(`shell-${i}`); await tapGame(shell.x, shell.y); await wait(200); }
      await wait(400); await screenshot('orehi');
    },
  };
  const playStep = async (step, echoId) => {
    assert.equal(await text('.echo-line'), step.intro);
    await click('#echo-continue');
    await waitFor(`!document.querySelector('dialog').open && window.__testGame.scene.isActive('Echo')`, `${step.id} starts`);
    await wait(300); await screenshot(`${echoId}-${step.id}-play`);
    await drivers[step.kind === 'reconstruct' ? 'reconstruct' : step.game](step);
    await waitFor(`document.querySelector('dialog.echo-panel')?.open && document.querySelector('.echo-line')?.textContent === ${JSON.stringify(step.solved)}`, `${step.id} solved`, 150);
  };
  const enterEcho = async (objective, label) => {
    await place(objective.x, objective.y); await press('e');
    await waitFor(`window.__testGame.scene.isActive('Echo') && document.querySelector('dialog.echo-panel')?.open`, label);
    await wait(300);
  };

  const playEcho = async (objective) => {
    const echo = echoes.find(e => e.id === objective.target);
    const before = await state('s.restoredEchoes.length');
    await dismountIfNeeded(); await place(objective.x, objective.y);
    assert.equal(await text('.interaction'), 'E · Step into the Echo');
    await wait(300); await screenshot(`${echo.id}-site`);
    await enterEcho(objective, `${echo.id} opens`);
    assert.equal(await state('s.sys.isPaused()'), true);
    await wait(300); await screenshot(`${echo.id}-intro`);
    assert.equal(await text('.echo-line'), echo.intro[0]);
    await click('#echo-continue');
    for (const [index, step] of echo.steps.entries()) {
      if (echo.id === 'cuisine' && step.id === 'creatures') {
        // Step out in the middle of a minigame, reload, and resume there with earlier stages kept.
        await click('#echo-continue'); await wait(500);
        await press('Escape');
        await worldBack('Escape leaves a running minigame');
        assert.deepEqual(await state('s.echoProgress'), { id: 'cuisine', steps: ['fragments', 'holiday'] });
        await reload();
        await enterEcho(objective, 'Echo IV resumes');
        assert.equal(await text('.echo-line'), 'The Echo picks up where you left off.');
        await click('#echo-continue');
      }
      if (step.kind === 'quiz') await answerQuiz(step, echo.id);
      else if (step.kind === 'match') await solveMatch(step, echo.id);
      else await playStep(step, echo.id);
      await wait(2600); await screenshot(`${echo.id}-${step.id}-solved`);
      if (echo.id === 'spark' && index === 0) {
        // Step out mid-Echo, reload, and resume at the next step.
        await press('Escape');
        await worldBack('Leaving the Echo returns to the world');
        assert.deepEqual(await state('s.echoProgress'), { id: 'spark', steps: ['crowd'] });
        assert.equal(await state('s.storyIndex'), objectives.indexOf(objective));
        await reload();
        assert.deepEqual(await state('s.echoProgress'), { id: 'spark', steps: ['crowd'] });
        await enterEcho(objective, 'Echo resumes');
        assert.equal(await text('.echo-line'), 'The Echo picks up where you left off.');
      }
      await click('#echo-continue');
    }
    assert.ok((await text('.echo-reward')).includes(`Echoes restored · ${before + 1} of 6`));
    assert.equal(await text('.echo-line'), echo.completion[0]);
    await screenshot(`${echo.id}-complete`);
    await click('#echo-continue');
    await waitFor(`!window.__testGame.scene.isActive('Echo') && window.__testGame.scene.isActive('World') && document.querySelector('dialog')?.open`, 'Return to Evervale');
    assert.equal(await text('#window-title'), 'Hana');
    assert.equal(await text('.dialogue-copy'), echo.reflection);
    assert.deepEqual(await state('[s.restoredEchoes.includes(' + JSON.stringify(echo.id) + '), s.echoProgress, s.inventory.get(' + JSON.stringify(echo.reward) + ')]'), [true, null, 1]);
    await reload();
    assert.equal(await text('.dialogue-copy'), echo.reflection, 'Reflection survives reload');
  };

  // Echo VI: prelude, future memory, questions with no wrong answers, the held lines, the card, the gifts.
  const playFinale = async (objective) => {
    const echo = echoes.find(e => e.id === objective.target);
    await dismountIfNeeded(); await place(objective.x, objective.y);
    assert.equal(await text('.interaction'), 'E · Step into the Echo');
    await wait(300); await screenshot('future-site');
    await press('e');
    await waitFor(`window.__testGame.scene.isActive('Echo')`, 'Echo VI opens');
    await waitFor(`window.__testGame.scene.getScene('Echo').children.list.some(o => o.text === 'This memory has not happened yet.' && o.alpha > 0.5)`, 'The prelude holds its line', 120);
    assert.equal(await dialogOpen(), false, 'The prelude plays before any panel');
    await screenshot('future-prelude');
    await waitFor(`document.querySelector('.echo-line')?.textContent === ${JSON.stringify(echo.intro[0])}`, 'Echo VI intro', 150);
    await click('#echo-continue');
    for (const step of echo.steps) {
      if (step.kind !== 'quiz') { await playStep(step, echo.id); await wait(1200); await screenshot(`future-${step.id}-solved`); await click('#echo-continue'); continue; }
      assert.equal(await text('.echo-question'), step.question);
      const pick = step.id === 'cats' ? 0 : step.id === 'evening' ? 3 : 2;
      await click(`#echo-option-${pick}`);
      await wait(250);
      if (step.options[pick].response) {
        assert.equal(await text('.echo-line'), step.options[pick].response, `${step.id}: every answer moves on`);
        await wait(1800); await screenshot(`future-${step.id}`);
        await click('#echo-continue');
      }
    }
    await waitFor(`window.__testGame.scene.getScene('Echo').children.list.some(o => o.text === 'We still have to make this one.' && o.alpha > 0.9)`, 'The final lines are held on the canvas', 120);
    assert.equal(await dialogOpen(), false, 'Nothing else is on screen during the final lines');
    await screenshot('future-final-lines');
    const reveal = await evaluate(`import('/src/data/birthdayGift.ts').then(m => ({ reveal: m.birthdayReveal, card: m.birthdayCard, gifts: m.birthdayGifts.items }))`);
    await waitFor(`document.querySelector('.echo-line')?.textContent === ${JSON.stringify(reveal.reveal[0])}`, 'The realization after a pause', 150);
    assert.equal(await evaluate('!!document.querySelector(".birthday-card, .birthday-gifts")'), false, 'The card waits for the realization');
    await click('#echo-continue');
    await waitFor(`!!document.querySelector('.birthday-card')`, 'Birthday card', 80);
    const card = await text('.birthday-card');
    for (const part of [reveal.card.heading, reveal.card.message, reveal.card.signature]) assert.ok(card.includes(part), part);
    assert.ok(card.includes('Banca'), 'Banca on the card');
    await screenshot('birthday-card');
    await click('#echo-continue');
    assert.equal(await evaluate('document.querySelectorAll(".birthday-gifts li").length'), reveal.gifts.length);
    assert.ok((await text('.echo-reward')).includes('Echoes restored · 6 of 6'));
    await screenshot('birthday-gifts');
    await click('#echo-continue');
    await waitFor(`!window.__testGame.scene.isActive('Echo') && window.__testGame.scene.isActive('World') && document.querySelector('dialog')?.open`, 'Return to Evervale');
    assert.equal(await text('.dialogue-copy'), echo.reflection);
    assert.deepEqual(await state('[s.restoredEchoes.length, s.echoProgress, ...["echo-spare-key", "echo-tack", "cat-bed"].map(id => s.inventory.get(id)), s.birthday.every(o => o.visible)]'), [6, null, 1, 1, 1, true]);
    await reload();
    assert.equal(await text('.dialogue-copy'), echo.reflection, 'Reflection survives reload');
  };

  const parade = async (objective) => {
    await dismountIfNeeded(); await place(objective.x, objective.y + 20);
    assert.equal(await text('.interaction'), 'E · Enter the Style Parade');
    await press('e');
    assert.ok((await text('.parade-intro')).includes('Absolutely horrid, darling'), 'The judge says it about the scarecrow');
    await screenshot('parade');
    // Sky is countryside-free: a gentle miss first, then any countryside piece passes.
    await click('#parade-outfit-sky'); await click('#parade-accessory-none'); await click('#parade-walk');
    assert.ok((await text('.inline-feedback')).length > 0, 'A look off-theme gets feedback, not failure');
    await click('#parade-accessory-straw-hat'); await click('#parade-walk');
    assert.ok((await text('.theme-card')).includes('★'));
    await press('Escape'); await reload();
    assert.deepEqual(await state('s.activityProgress'), ['countryside'], 'Parade rounds persist');
    await place(objective.x, objective.y + 20); await press('e');
    assert.equal(await evaluate('!!document.querySelector(".parade-intro")'), false, 'The scarecrow line is said once');
    await click('#parade-accessory-teal-scarf'); await click('#parade-walk'); await click('#parade-next');
    await click('#parade-accessory-riding-helmet'); await click('#parade-walk');
    assert.ok(await evaluate('!!document.querySelector("#parade-done")'));
    await click('#parade-done');
    assert.equal(await state('s.inventory.get("flower-crown")'), 1);
  };

  // Accelerated fresh-save story: teleport travel, real E/menu/click/mouse input.
  const started = Date.now();
  for (let index = 0; index < objectives.length; index++) {
    const objective = objectives[index];
    assert.equal(await state('s.storyIndex'), index, objective.id);
    if (objective.type === 'ride') {
      await mount(); await place(objective.x, objective.y, true);
    } else if (objective.type === 'mount') {
      await dismountIfNeeded(); await mount();
    } else if (objective.type === 'race') {
      const first = objective.target === 'meadow-sprint';
      await race(objective.target, { retry: first, checks: first });
    } else if (objective.type === 'equip') {
      await press('o'); await click('#outfits-tab'); await click('#equip-sky');
      await click('#accessories-tab'); await click('#wear-straw-hat'); assert.equal(await state('s.accessoryId'), 'straw-hat');
      await screenshot('wardrobe-accessory'); await click('#wear-none'); await press('Escape');
    } else if (objective.type === 'decorate') {
      const [slot, choice] = objective.target === 'any-slot' ? ['window', 'lantern'] : ['door', objective.target];
      await press('h'); await click('#stable-tab'); await click(`#decorate-${slot}`); await click(`#place-${slot}-${choice}`);
      assert.equal(await state(`s.decorationSelections.get(${JSON.stringify(slot)})`), choice);
      await press('Escape');
    } else if (objective.type === 'care') {
      await dismountIfNeeded();
      await groom();
      assert.equal(await dialogOpen(), true, 'Horse care reopens after grooming');
      await click('#care-water');
      await press('Escape'); await reload();
      assert.deepEqual(await state('s.activityProgress'), ['brush', 'water']);
      const [hx, hy] = await state('[s.horse.display.x, s.horse.display.y]');
      await place(hx - 50, hy); await press('h'); await click('#horse-tab'); await click('#care-treat'); await press('Escape');
    } else if (objective.type === 'groom') {
      await dismountIfNeeded(); await groom();
    } else if (objective.type === 'fashion') {
      await parade(objective);
    } else if (objective.type === 'trail') {
      await mount();
      for (const [n, point] of objective.points.entries()) {
        if (n === 0) {
          await wait(700);
          assert.ok(await state('s.trail.root.list.length > 0 && s.trail.beacon.visible'), 'Glowing hoofprints lead the way');
          await screenshot(`trail-${objective.target}`);
        }
        await place(point.x, point.y, true);
        if (n === 0 && objective.points.length > 1) { await reload(); assert.deepEqual(await state('s.activityProgress'), [point.id]); await mount(); }
      }
    } else if (objective.type === 'echo') {
      if (echoes.find(e => e.id === objective.target).finale) await playFinale(objective);
      else await playEcho(objective);
    } else if (objective.type === 'pet') {
      await dismountIfNeeded();
      assert.equal(await state('s.bolt.display.visible'), true, 'Bolt appears after Echo V');
      const [x, y] = await state('[s.bolt.x, s.bolt.y]');
      await place(x - 25, y); await wait(100);
      assert.equal(await text('.interaction'), 'E · Pet Bolt');
      await screenshot('bolt');
      await press('e');
    } else if (objective.type === 'choose-horse') {
      await dismountIfNeeded(); await place(objective.x, objective.y); await wait(200);
      assert.equal(await text('.interaction'), 'E · Meet the horses');
      await press('e');
      assert.equal(await text('#window-title'), 'Meet your horse');
      assert.equal(await evaluate('document.querySelector(".horse-card").id'), 'horse-brown-quarter-horse');
      assert.equal(await evaluate('document.querySelector("#horse-name-input").value'), 'Sky');
      await click('#horse-gray-mustang'); assert.equal(await evaluate('document.querySelector("#horse-name-input").value'), 'Silver');
      await click('#horse-brown-quarter-horse');
      await click('#confirm-horse');
      assert.deepEqual(await state('[s.horseId, s.horseName, s.horse.display.visible]'), ['brown-quarter-horse', 'Sky', true]);
    } else {
      await dismountIfNeeded();
      const locations = { 'stable-keeper': [800, 550], 'village-baker': [360, 330], 'bakery-gift': [360, 330] };
      const [x, y] = objective.type === 'cat' ? await catAt(objective.target) : locations[objective.target] ?? [objective.x, objective.y];
      await place(x, y);
      if (objective.type === 'cat') assert.ok((await text('.interaction')).includes('Pet'), 'Cat offers pet interaction');
      await press('e');
      if (objective.type === 'shop') {
        await click('#browse-shop'); await click('#claim-outfit');
        assert.equal(await state('s.inventory.get("berry-gift")'), 1);
        await press('Escape');
      }
    }
    assert.equal(await state('s.storyIndex'), index + 1, `Completed ${objective.id}`);
    if (objective.type === 'talk') {
      assert.equal(await text('.dialogue-copy'), objective.payoff);
      await reload();
      assert.equal(await text('.dialogue-copy'), objective.payoff, 'Quest dialogue survives reload');
    }
    if (objective.type === 'inspect') assert.equal(await dialogOpen(), true);
    if (await dialogOpen()) await press('Enter');
    if (objective.chapterEnd) { await reload(); assert.equal(await state('s.storyIndex'), index + 1); log(`${objective.chapter} · ${((Date.now() - started) / 1000).toFixed(0)}s`); }
    if (objective.target === 'oak-stirring') {
      // Before the final Echo: five restored, one different, finale rewards reserved, and the last trail wakes the site.
      assert.deepEqual(await state('s.restoredEchoes'), ['spark', 'break', 'half-bed', 'cuisine', 'first-winter']);
      assert.equal(await state('s.inventory.has("echo-tack")'), false, 'Birthday finale rewards stay reserved');
      assert.equal(await state('s.echoSites.oakLights.filter(l=>l.alpha>0.9).length'), 5, 'Five oak lights are lit');
      assert.equal(await state('s.echoSites.dormant.has("future")'), false, 'The last trail wakes the site beside the stable');
      await press('j');
      const journal = await text('dialog');
      assert.ok(journal.includes('Echoes · 5 of 6 restored') && journal.includes('Animal friends') && journal.includes('Bolt') && journal.includes('Best times') && !journal.includes('Read your birthday card'), 'Journal before the finale');
      await screenshot('journal-5'); await press('Escape');
      await press('o'); assert.equal(await evaluate('!!document.querySelector("#equip-birthday-teal")'), false); await press('Escape');
    }
  }

  // After the birthday: 6 / 6, decorations, the card, gifts, cats, every race, and a free world.
  const objectiveText = await text('.objective');
  assert.ok(objectiveText.includes('Happy birthday, Hana!') && objectiveText.includes('6 / 6'), objectiveText);
  assert.equal(await state('s.echoSites.oakLights.filter(l=>l.alpha>0.9).length'), 6, 'All six oak lights are lit');
  await place(800, 520); await wait(600); await screenshot('postgame-stable');
  await press('j');
  assert.ok((await text('dialog')).includes('Echoes · 6 of 6 restored'), 'Journal 6 / 6');
  await click('#birthday-card');
  assert.ok((await text('.birthday-card')).includes('Happy birthday, Banca'), 'The card reopens from the journal');
  await screenshot('card-reopened');
  await click('#card-back'); assert.ok((await text('dialog')).includes('Echoes · 6 of 6 restored')); await press('Escape');
  await press('o'); await click('#outfits-tab'); await click('#equip-birthday-teal'); assert.equal(await state('s.outfitId'), 'birthday-teal');
  await click('#accessories-tab'); assert.ok(await evaluate('!!document.querySelector("#wear-flower-crown")'), 'The parade prize is wearable'); await click('#wear-flower-crown'); await press('Escape');
  await press('h'); await click('#tack-tab'); const tack = await text('dialog'); assert.ok(tack.includes('Forest Run rosette') && tack.includes('Teal & oak birthday tack')); await click('#stable-tab'); await click('#decorate-window');
  for (const id of ['glow-sticks', 'phone-charm', 'banjole-shell', 'teal-posy', 'foil-tray', 'banca-card', 'echo-lantern', 'spare-key', 'cat-bed']) assert.ok(await evaluate(`!!document.querySelector('#place-window-${id}')`), id);
  await click('#place-window-echo-lantern'); await press('Escape');
  // Optional: meeting all five cats unlocks a sweater. Maks and Maco are the last two here.
  for (const id of ['maco', 'maks']) {
    for (let attempt = 0; attempt < 6 && !(await state(`s.animals.has(${JSON.stringify(id)})`)); attempt++) { const [x, y] = await catAt(id); await place(x, y); await press('e'); await wait(300); }
    assert.equal(await state(`s.animals.has(${JSON.stringify(id)})`), true, id);
  }
  assert.equal(await state('s.inventory.get("cat-sweater")'), 1, 'All five cats met');
  await press('o'); await click('#accessories-tab'); await click('#wear-cat-sweater'); await screenshot('cat-sweater'); await press('Escape');
  // Nomi gets annoyed if pestered.
  const nomi = await catAt('nomi');
  await place(nomi[0] + 20, nomi[1]);
  for (let n = 0; n < 3; n++) { await press('e'); }
  assert.ok((await text('.reward-toast')).includes('had quite enough'));
  // The keeper, once Nomi has stopped getting in the way.
  for (let attempt = 0; attempt < 6 && !(await dialogOpen()); attempt++) { await place(800, 550); await press('e'); await wait(300); }
  assert.ok((await text('.dialogue-copy')).includes('bunting'), 'The keeper knows about the bunting'); await press('Escape');
  // Every track stays open after the ending; the Moonlight Derby still plays start to finish.
  await place(1005, 612); await press('e');
  assert.ok(await evaluate('["meadow-sprint","forest-run","moonlight-derby"].every(id => !!document.querySelector("#race-" + id))'), 'All tracks open after the ending');
  await press('Escape');
  await race('moonlight-derby');
  for (const [width, height] of [[1024, 768], [1920, 1080]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await press('o');
    assert.equal(await evaluate('(()=>{const r=document.querySelector("dialog").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()'), true);
    await press('Escape');
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await reload();
  assert.deepEqual(await state('[s.horseName, s.storyIndex, s.restoredEchoes.length, s.accessoryId, s.outfitId, s.raceBest.size, s.animals.size, s.decorationSelections.get("window"), s.birthday.every(o => o.visible)]'),
    ['Sky', objectives.length, 6, 'cat-sweater', 'birthday-teal', 3, 6, 'echo-lantern', true], 'The completed birthday save survives a reload');
  assert.ok((await text('.objective')).includes('Happy birthday, Hana!'), 'Continue lands in the finished world');
  assert.equal(await evaluate('document.querySelectorAll("dialog").length'), 1);
  assert.ok(await evaluate(`Array.from(document.images).every(img=>img.complete && img.naturalWidth>0)`));

  // Main menu: Continue only with a save, Settings keep the volume, New Game asks before replacing the save.
  const menuRows = () => sceneState('MainMenu', 's.rows.map(r => r.item.name)');
  await wait(1100); await send('Page.reload'); await waitForMenu(); await wait(300);
  assert.deepEqual(await menuRows(), ['menu-continue', 'menu-new', 'menu-settings']);
  await screenshot('menu-continue');
  await press('ArrowDown'); await press('ArrowDown'); await press('Enter');
  assert.deepEqual(await menuRows(), ['settings-volume', 'settings-back']);
  await press('ArrowLeft'); await press('ArrowLeft');
  assert.equal(await evaluate('Math.round(window.__testGame.sound.volume * 100)'), 80);
  await screenshot('menu-settings'); await press('Escape');
  await send('Page.reload'); await waitForMenu(); await wait(300);
  assert.equal(await evaluate('Math.round(window.__testGame.sound.volume * 100)'), 80, 'Volume persists');
  await press('ArrowDown'); await press('Enter');
  assert.deepEqual(await menuRows(), ['confirm-keep', 'confirm-new'], 'New Game asks first');
  await screenshot('menu-confirm');
  await press('Enter');
  assert.deepEqual(await menuRows(), ['menu-continue', 'menu-new', 'menu-settings'], 'Keeping the save returns to the menu');
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('whispers-of-evervale-save')).storyTarget`), 'complete');
  await press('ArrowDown'); await press('Enter'); await press('ArrowDown'); await press('Enter');
  await waitFor(`window.__testGame.scene.isActive('CharacterCreator')`, 'Start over opens the creator');
  await wait(300);
  const begin = await sceneState('CharacterCreator', '(b => ({ x: b.x, y: b.y }))(s.children.getByName("creator-begin"))');
  await tapGame(begin.x, begin.y);
  await waitFor(`window.__testGame.scene.isActive('World')`, 'Clicking Begin opens a fresh world');
  await wait(300);
  assert.deepEqual(await state('[s.storyIndex, s.restoredEchoes.length, s.horseName]'), [0, 0, null], 'New Game starts over');
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('whispers-of-evervale-save')).storyIndex`), 0, 'The old save was replaced only after confirming');
  console.log('Observed browser FPS:', await evaluate('Math.round(window.__testGame.loop.actualFps)'));
  assert.deepEqual(errors, []);
  console.log(`PASS: fresh save through the birthday finale (${objectives.length} objectives, accelerated travel) in ${((Date.now() - started) / 1000).toFixed(0)}s: races with jump, bump and retry, grooming, trails, all six Echoes and their minigames, the future apartment, open questions, card and gifts, postgame decorations, journal card, cat sweater, Moonlight Derby after the ending, main menu Continue/Settings/New Game, leave/resume and reloads; no browser errors.`);
} finally {
  socket?.close();
  browser.kill();
  await new Promise(resolve => browser.once('exit', resolve));
  rmSync(profile, { recursive: true, force: true });
}
