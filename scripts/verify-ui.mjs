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
  const state = expression => evaluate(`(()=>{const s=window.__testGame.scene.getScene('World');return (${expression})})()`);
  const key = (key, type = 'keyDown') => send('Input.dispatchKeyEvent', { type, key, text: type === 'keyDown' && key === 'Enter' ? '\r' : undefined, code: key.length === 1 ? `Key${key.toUpperCase()}` : key, windowsVirtualKeyCode: ({ Enter: 13, Escape: 27, Tab: 9, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, ' ': 32 })[key] ?? key.toUpperCase().charCodeAt(0) });
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

  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*/src/main.ts*' }] });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url }); await waitForMenu();
  await screenshot('menu'); await press('Enter'); await wait(200);
  assert.equal(await evaluate(`window.__testGame.scene.isActive('CharacterCreator')`), true);
  await screenshot('creator');
  for (let choice = 0; choice < 3; choice++) await press('ArrowRight');
  await press('Enter'); await wait(400);
  assert.equal(await state('s.sys.isActive()'), true);
  assert.equal(await state('s.horseName'), null, 'The creator only creates Hana');
  assert.equal(await state('s.horse.display.visible'), false);
  assert.equal(await evaluate('document.querySelector(".race-hud").hidden'), true);
  assert.equal(await evaluate(`['riders','horses','environment-ground','cat-nomi','cat-miki','cat-viski','cat-maks','cat-maco','figure-hana','figure-tian','figure-maj','figure-tilen'].every(k=>window.__testGame.textures.exists(k))`), true);
  await state(`void s.cameras.main.stopFollow().setZoom(0.52).centerOn(900,550)`); await wait(150); await screenshot('world-overview');
  await state(`void s.cameras.main.startFollow(s.cameraTarget)`);
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
  await place(200, 390); await press('e');
  assert.ok((await text('.reward-toast')).includes('Viski'), 'Viski is at the village hall');
  // Maks runs off when approached.
  const maks = await state('[s.cats.find(c=>c.definition.id==="maks").x, s.cats.find(c=>c.definition.id==="maks").y]');
  await place(maks[0] - 60, maks[1]); await wait(1600);
  assert.ok(await state(`Math.hypot(s.cats.find(c=>c.definition.id==="maks").x-${maks[0]}, s.cats.find(c=>c.definition.id==="maks").y-${maks[1]}) > 60`), 'Maks runs away');
  await dismountIfNeeded();

  const objectives = await evaluate(`import('/src/data/story.ts').then(module=>module.storyObjectives)`);
  const echoes = await evaluate(`import('/src/data/echoes.ts').then(module=>module.echoes)`);
  const catAt = async id => state(`(()=>{const c=s.cats.find(c=>c.definition.id===${JSON.stringify(id)});return [c.x,c.y]})()`);
  async function dismountIfNeeded() { if (await state('s.mounted')) await press('e'); }
  const mount = async () => {
    if (await state('s.mounted')) return;
    await place(1000, 1000, true); await place(1000, 1000); await press('e');
    assert.equal(await state('s.mounted'), true);
  };
  const waitForRace = () => waitFor(`(()=>{const s=window.__testGame.scene.getScene('World');return s.countdownMs===0&&s.raceCheckpointIndex!==null})()`, 'Race countdown did not finish');
  const runRace = async () => {
    const apples = await state('s.inventory.get("horse-apple") ?? 0');
    await place(975, 650, true); await press('r'); await click('#cancel-race');
    assert.equal(await state('s.raceCheckpointIndex'), null);
    await press('r'); await click('#ready-race');
    const countdownPosition = await state('[s.horse.display.x,s.horse.display.y]');
    await key('d'); await wait(250); await key('d', 'keyUp');
    assert.deepEqual(await state('[s.horse.display.x,s.horse.display.y]'), countdownPosition);
    await waitForRace(); await wait(150);
    assert.equal(await state('s.raceCheckpointIndex'), 0);
    await place(930, 940, true); assert.equal(await state('s.raceCheckpointIndex'), 1);
    await reload();
    assert.equal(await state('s.raceCheckpointIndex'), 1);
    await place(1500, 430, true); await place(700, 280, true);
    assert.equal(await state('s.raceCheckpointIndex'), null);
    assert.equal(await state('s.inventory.get("horse-apple")'), apples + 1);
    assert.equal(await text('#window-title'), 'A lovely ride!');
    await click('#finish-race');
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
  const playEcho = async (objective) => {
    const echo = echoes.find(e => e.id === objective.target);
    const before = await state('s.restoredEchoes.length');
    await dismountIfNeeded(); await place(objective.x, objective.y);
    assert.equal(await text('.interaction'), 'E · Step into the Echo');
    await wait(300); await screenshot(`${echo.id}-site`);
    await press('e');
    await waitFor(`window.__testGame.scene.isActive('Echo') && document.querySelector('dialog.echo-panel')?.open`, `${echo.id} opens`);
    assert.equal(await state('s.sys.isPaused()'), true);
    await wait(600); await screenshot(`${echo.id}-intro`);
    assert.equal(await text('.echo-line'), echo.intro[0]);
    await click('#echo-continue');
    for (const [index, step] of echo.steps.entries()) {
      if (step.kind === 'quiz') await answerQuiz(step, echo.id); else await solveMatch(step, echo.id);
      await wait(2600); await screenshot(`${echo.id}-${step.id}-solved`);
      if (echo.id === 'spark' && index === 0) {
        // Step out mid-Echo, reload, and resume at the next step.
        await press('Escape');
        await waitFor(`!window.__testGame.scene.isActive('Echo') && window.__testGame.scene.isActive('World')`, 'Leaving the Echo returns to the world');
        assert.deepEqual(await state('s.echoProgress'), { id: 'spark', steps: ['crowd'] });
        assert.equal(await state('s.storyIndex'), objectives.indexOf(objective));
        await reload();
        assert.deepEqual(await state('s.echoProgress'), { id: 'spark', steps: ['crowd'] });
        await place(objective.x, objective.y); await press('e');
        await waitFor(`window.__testGame.scene.isActive('Echo') && document.querySelector('dialog.echo-panel')?.open`, 'Echo resumes');
        await wait(300);
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

  // Accelerated fresh-save story: teleport travel, real E/menu/click input.
  for (let index = 0; index < objectives.length; index++) {
    const objective = objectives[index];
    assert.equal(await state('s.storyIndex'), index, objective.id);
    if (objective.type === 'ride') {
      await mount(); await place(objective.x, objective.y, true);
    } else if (objective.type === 'mount') {
      await dismountIfNeeded(); await mount();
    } else if (objective.type === 'race') {
      await runRace();
    } else if (objective.type === 'equip') {
      await press('o'); await click('#outfits-tab'); await click('#equip-sky'); await press('Escape');
    } else if (objective.type === 'decorate') {
      await press('h'); await click('#stable-tab'); await click('#decorate-window'); await press('Escape');
    } else if (objective.type === 'care') {
      await dismountIfNeeded();
      const [x, y] = await state('[s.horse.display.x, s.horse.display.y]');
      await place(x - 50, y); await press('h'); await click('#horse-tab');
      for (const action of ['brush', 'water']) await click(`#care-${action}`);
      await press('Escape'); await reload();
      assert.deepEqual(await state('s.activityProgress'), ['brush', 'water']);
      const [hx, hy] = await state('[s.horse.display.x, s.horse.display.y]');
      await place(hx - 50, hy); await press('h'); await click('#horse-tab'); await click('#care-treat'); await press('Escape');
    } else if (objective.type === 'trail') {
      await mount();
      for (const [n, point] of objective.points.entries()) {
        await place(point.x, point.y, true);
        if (n === 0 && objective.points.length > 1) { await reload(); assert.deepEqual(await state('s.activityProgress'), [point.id]); await mount(); await wait(300); await screenshot(`trail-${objective.target}`); }
      }
    } else if (objective.type === 'echo') {
      await playEcho(objective);
    } else if (objective.type === 'choose-horse') {
      await dismountIfNeeded(); await place(objective.x, objective.y); await wait(200); await screenshot('paddock');
      assert.equal(await text('.interaction'), 'E · Meet the horses');
      await press('e');
      assert.equal(await text('#window-title'), 'Meet your horse');
      assert.equal(await evaluate('document.querySelectorAll(".horse-card").length'), 3);
      assert.equal(await evaluate('document.querySelector(".horse-card").id'), 'horse-brown-quarter-horse');
      assert.equal(await evaluate('document.querySelector(".horse-card").getAttribute("aria-pressed")'), 'true');
      assert.equal(await evaluate('document.querySelector("#horse-name-input").value'), 'Sky');
      await screenshot('horse-choice');
      await click('#horse-gray-mustang'); assert.equal(await evaluate('document.querySelector("#horse-name-input").value'), 'Silver');
      await click('#horse-brown-quarter-horse'); assert.equal(await evaluate('document.querySelector("#horse-name-input").value'), 'Sky');
      await evaluate(`(()=>{const i=document.querySelector('#horse-name-input');i.value='Skye';i.dispatchEvent(new Event('input'))})()`);
      assert.equal(await text('#confirm-horse'), 'Choose Skye');
      await click('#horse-dark-bay-friesian'); assert.equal(await evaluate('document.querySelector("#horse-name-input").value'), 'Skye', 'Custom names survive switching');
      await click('#horse-brown-quarter-horse');
      await evaluate(`(()=>{const i=document.querySelector('#horse-name-input');i.value='Sky';i.dispatchEvent(new Event('input'))})()`);
      await click('#confirm-horse');
      assert.deepEqual(await state('[s.horseId, s.horseName, s.horse.display.visible, s.paddock.get("brown-quarter-horse").visible]'), ['brown-quarter-horse', 'Sky', true, false]);
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
    if (objective.chapterEnd) { await reload(); assert.equal(await state('s.storyIndex'), index + 1); }
  }

  // Temporary end of this batch: free roam with the mystery visibly unfinished.
  assert.ok((await text('.objective')).includes('More Echoes are stirring'));
  assert.deepEqual(await state('s.restoredEchoes'), ['spark', 'break', 'half-bed']);
  assert.equal(await state('s.inventory.has("echo-tack")'), false, 'Birthday finale rewards stay reserved');
  await press('j'); assert.ok((await text('dialog')).includes('Echoes · 3 of 6 restored')); await screenshot('journal'); await press('Escape');
  await press('o'); assert.equal(await evaluate('!!document.querySelector("#equip-birthday-teal")'), false); await press('Escape');
  await press('h'); await click('#stable-tab');
  const seen = new Set();
  for (let n = 0; n < 8; n++) { await click('#decorate-window'); seen.add(await state('s.decorationSelections.get("window")')); }
  for (const id of ['glow-sticks', 'phone-charm', 'banjole-shell', 'teal-posy']) assert.ok(seen.has(id), id);
  assert.ok(!seen.has('echo-lantern'));
  await press('Escape');
  // Nomi gets annoyed if pestered.
  const nomi = await catAt('nomi');
  await place(nomi[0] + 20, nomi[1]);
  for (let n = 0; n < 3; n++) { await press('e'); }
  assert.ok((await text('.reward-toast')).includes('had quite enough'));

  // Ride a complete race lap with real key events.
  await mount(); await place(975, 650, true); await press('r'); await click('#ready-race'); await waitForRace(); await wait(150);
  const rideTo = async (targetX, targetY) => {
    const held = new Set();
    for (let step = 0; step < 100; step++) {
      const [x, y] = await state('[s.horse.display.x,s.horse.display.y]');
      const dx = targetX - x; const dy = targetY - y;
      if (Math.hypot(dx, dy) < 35) break;
      const wanted = new Set();
      if (Math.abs(dx) > 18) wanted.add(dx > 0 ? 'd' : 'a');
      if (Math.abs(dy) > 18) wanted.add(dy > 0 ? 's' : 'w');
      for (const k of held) if (!wanted.has(k)) { await key(k, 'keyUp'); held.delete(k); }
      for (const k of wanted) if (!held.has(k)) { await key(k); held.add(k); }
      await wait(80);
    }
    for (const k of held) await key(k, 'keyUp');
    await wait(350);
    assert.ok(await state(`Math.hypot(s.horse.display.x-${targetX},s.horse.display.y-${targetY})<65`), 'Ride reached waypoint');
  };
  await rideTo(930, 940); await rideTo(1470, 940); await rideTo(1500, 430); await rideTo(1450, 280); await rideTo(700, 280);
  assert.equal(await text('#window-title'), 'A lovely ride!');
  await click('#finish-race');
  for (const [width, height] of [[1024, 768], [1920, 1080]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await press('o');
    assert.equal(await evaluate('(()=>{const r=document.querySelector("dialog").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()'), true);
    await press('Escape');
  }
  await reload();
  assert.deepEqual(await state('[s.horseName, s.storyIndex, s.restoredEchoes.length, s.inventory.get("horse-apple")]'), ['Sky', objectives.length, 3, 2]);
  assert.equal(await evaluate('document.querySelectorAll("dialog").length'), 1);
  assert.ok(await evaluate(`Array.from(document.images).every(img=>img.complete && img.naturalWidth>0)`));
  console.log('Observed browser FPS:', await evaluate('Math.round(window.__testGame.loop.actualFps)'));
  assert.deepEqual(errors, []);
  console.log(`PASS: fresh save through Echo III (${objectives.length} objectives, accelerated travel), horse choice + naming, Echo quizzes/match with wrong-answer retry, leave/resume, rewards, reloads, cats, race, free roam; no browser errors.`);
} finally {
  socket?.close();
  browser.kill();
  await new Promise(resolve => browser.once('exit', resolve));
  rmSync(profile, { recursive: true, force: true });
}
