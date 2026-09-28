// Run `npm run dev` first, then `node scripts/verify-ui.mjs` (Node 22+, Chromium on PATH).
// Uses an isolated browser and a test-only intercepted entrypoint; production exposes no game handle.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const url = process.env.GAME_URL ?? 'http://127.0.0.1:5173';
const profile = mkdtempSync(join(tmpdir(), 'evervale-ui-'));
const browser = spawn(process.env.CHROMIUM ?? 'chromium', ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank']);
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
    } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
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
  const waitForMenu = async () => {
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        if (await evaluate(`window.__testGame?.scene.isActive('MainMenu')`)) return;
      } catch (error) {
        // Reload can destroy the execution context between the poll and its reply.
        if (!/Inspected target navigated|Execution context was destroyed|Cannot find context/.test(String(error))) throw error;
      }
      await wait(100);
    }
    assert.fail('Main menu did not load: ' + JSON.stringify(errors));
  };
  const state = expression => evaluate(`(()=>{const s=window.__testGame.scene.getScene('World');return (${expression})})()`);
  const key = (key, type = 'keyDown') => send('Input.dispatchKeyEvent', { type, key, text: type === 'keyDown' && key === 'Enter' ? '\r' : undefined, code: key.length === 1 ? `Key${key.toUpperCase()}` : key, windowsVirtualKeyCode: ({ Enter: 13, Escape: 27, Tab: 9, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, ' ': 32 })[key] ?? key.toUpperCase().charCodeAt(0) });
  const press = async k => { await key(k); await wait(70); await key(k, 'keyUp'); await wait(130); };
  const click = async selector => {
    const point = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing ${selector}');e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
    await wait(120);
  };
  const place = async (x, y, horse = false) => { await state(`s.${horse ? 'horseBody' : 'playerBody'}.reset(${x},${y})`); await wait(120); };
  const screenshot = async name => { const shot = await send('Page.captureScreenshot'); writeFileSync(join(tmpdir(), `evervale-${name}.png`), Buffer.from(shot.data, 'base64')); };
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*/src/main.ts*' }] });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url }); for (let attempt=0; attempt<100 && !(await evaluate(`window.__testGame?.scene.isActive('MainMenu')`)); attempt++) await wait(100);
  assert.equal(await evaluate(`window.__testGame?.scene.isActive('MainMenu')`), true, JSON.stringify(errors));
  await screenshot('menu'); await press('Enter'); await screenshot('creator');
  for (let choice = 0; choice < 3; choice++) { await press('ArrowRight'); await press('ArrowDown'); await screenshot(`creator-${choice}`); }
  await press('Enter'); await wait(400);
  assert.equal(await state('s.sys.isActive()'), true);
  assert.equal(await evaluate('document.querySelector(".race-hud").hidden'), true);
  assert.equal(await state('s.checkpointMarkers.every(m=>!m.visible)'), true);
  await screenshot('hud');
  assert.equal(await evaluate(`['riders','horses','cats','environment-ground'].every(k=>window.__testGame.textures.exists(k))`), true);
  assert.equal(await state(`s.playerArt.frame.name`), 0);
  await state(`void s.cameras.main.stopFollow().setZoom(0.52).centerOn(900,550)`); await wait(150); await screenshot('world-overview');
  await state(`void s.cameras.main.startFollow(s.cameraTarget)`);
  for (const shortcut of ['i', 'o', 'h', 'j', 'Escape']) {
    await press(shortcut);
    assert.equal(await evaluate('document.querySelector("dialog").open'), true);
    const position = await state('[s.player.x,s.player.y]');
    await key('d'); await wait(160); await key('d', 'keyUp');
    assert.deepEqual(await state('[s.player.x,s.player.y]'), position);
    for (let n = 0; n < 8; n++) await press('Tab');
    assert.equal(await evaluate('document.querySelector("dialog").contains(document.activeElement)'), true);
    await press('Escape');
    assert.equal(await evaluate('document.querySelector("dialog").open'), false);
  }
  await press('o'); assert.equal(await evaluate('!!document.querySelector("#equip-berry")'), false); await click('#equip-sky');
  assert.equal(await state('s.outfitId'), 'sky');
  assert.equal(await evaluate('document.querySelector("#equip-sky").getAttribute("aria-pressed")'), 'true');
  await screenshot('wardrobe');
  await click('#rider-tab'); await click('#equip-chestnut'); await click('#close-window');
  await press('h'); await click('#tack-tab'); await click('#stable-tab'); await click('#decorate-window'); await click('#horse-tab'); await screenshot('horse'); await press('Escape');
  // A short walk starts promptly and release settles without drift.
  await key('d'); await wait(120);
  assert.ok(await state('s.playerBody.velocity.x > 150'));
  await key('d', 'keyUp'); await wait(300);
  assert.equal(await state('s.playerBody.speed'), 0);
  await place(200,390); await press('e');
  assert.ok(await evaluate(`document.querySelector('.reward-toast').textContent.includes('Prrrr')`));
  await place(975,650); await press('e'); assert.equal(await state('s.mounted'), true);
  // Collision circle must be centered on the horse, and reversing must not mirror its physics body.
  assert.ok(await state('Math.abs(s.horseBody.center.x-s.horse.display.x)<1'));
  await key('s'); await wait(100); const accelerating = await state('s.horseBody.velocity.y');
  assert.ok(accelerating > 80 && accelerating < 300);
  await wait(350); assert.ok(await state('s.horseBody.velocity.y > 300'));
  await key('s', 'keyUp'); await wait(500); assert.equal(await state('s.horseBody.speed'), 0);
  await key('a'); await wait(120); await key('a', 'keyUp'); await wait(500);
  assert.ok(await state('Math.abs(s.horseBody.center.x-s.horse.display.x)<1'));
  // Ride against a solid obstacle and the world edge: no penetration or escape.
  await place(950, 550, true); await key('d'); await wait(650); await key('d', 'keyUp'); await wait(250);
  assert.ok(await state('Math.hypot(s.horse.display.x-1050,s.horse.display.y-550)>=72'));
  await place(45, 650, true); await key('a'); await wait(500); await key('a', 'keyUp'); await wait(300);
  assert.ok(await state('s.horse.display.x>=25'));
  // Accelerated fresh-save story integration: teleport travel, use real interaction/menu inputs.
  // This checks progression and persistence; it is not a 45–75 minute pacing measurement.
  const objectives = await evaluate(`import('/src/data/story.ts').then(module=>module.storyObjectives)`);
  const dismount = async () => { if (await state('s.mounted')) await press('e'); };
  const mount = async () => {
    if (await state('s.mounted')) return;
    await place(1000,1000,true); await place(1000,1000); await press('e');
    assert.equal(await state('s.mounted'), true);
  };
  const reload = async () => { await wait(1100); await send('Page.reload'); await waitForMenu(); await press('Enter'); await wait(150); };
  await dismount(); await place(360,330); await press('e'); await click('#browse-shop'); await click('#claim-outfit'); await press('Escape');
  assert.equal(await state('s.storyIndex'), 0, 'Optional early shopping does not advance the story');
  assert.equal(await state('s.inventory.get("berry-gift")'), 1);
  const parserChecks = await evaluate(`(async()=>{
    const {parseGameSave,loadGameSave}=await import('/src/data/save.ts');
    const save=loadGameSave();
    const invalid=[-1,1.5,${objectives.length + 1},'1',null].map(storyIndex=>parseGameSave(JSON.stringify({...save,storyIndex}))===null);
    const legacy={...save};delete legacy.storyIndex;
    const unfinished=parseGameSave(JSON.stringify({...legacy,firstRideIndex:0,echoQuestIndex:0}));
    const completed=parseGameSave(JSON.stringify({...legacy,firstRideIndex:4,echoQuestIndex:3}));
    return {invalid,unfinished:unfinished?.storyIndex,completed:completed?.storyIndex};
  })()`);
  assert.deepEqual(parserChecks,{invalid:[true,true,true,true,true],unfinished:0,completed:objectives.length});
  const waitForRace = async () => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await state('s.countdownMs === 0 && s.raceCheckpointIndex !== null')) { await wait(150); return; }
      await wait(100);
    }
    assert.fail('Race countdown did not finish');
  };
  const runRace = async () => {
    const apples = await state('s.inventory.get("horse-apple") ?? 0');
    await place(975, 650, true); await press('r'); await click('#cancel-race');
    assert.equal(await state('s.raceCheckpointIndex'), null);
    await press('r'); await screenshot('briefing'); await click('#ready-race');
    assert.equal(await state('s.raceCheckpointIndex'), null);
    const countdownPosition = await state('[s.horse.display.x,s.horse.display.y]');
    await key('d'); await wait(250); await key('d', 'keyUp');
    assert.deepEqual(await state('[s.horse.display.x,s.horse.display.y]'), countdownPosition);
    await screenshot('countdown'); await wait(2900);
    assert.equal(await state('s.raceCheckpointIndex'), 0);
    assert.equal(await evaluate('document.querySelector(".race-hud").hidden'), false);
    await press('Escape'); const elapsed = await state('s.raceElapsedMs'); await wait(400);
    assert.equal(await state('s.raceElapsedMs'), elapsed); await press('Escape');
    await place(930, 940, true); assert.equal(await state('s.raceCheckpointIndex'), 1);
    await screenshot('race');
    // Resume an active race through the unchanged save format.
    await wait(1100); await send('Page.reload'); await waitForMenu(); await press('Enter'); await wait(200);
    assert.equal(await state('s.raceCheckpointIndex'), 1);
    await place(1500, 430, true); await place(700, 280, true);
    assert.equal(await state('s.raceCheckpointIndex'), null);
    assert.equal(await state('s.inventory.get("horse-apple")'), apples + 1);
    assert.equal(await evaluate('document.querySelector("#window-title").textContent'), 'A lovely ride!');
    await screenshot('results'); await click('#finish-race');
    assert.equal(await evaluate('document.querySelector(".race-hud").hidden'), true);
    assert.equal(await state('s.checkpointMarkers.every(m=>!m.visible)'), true);
    await wait(1100); await send('Page.reload'); await waitForMenu(); await press('Enter');
    assert.equal(await state('s.inventory.get("horse-apple")'), apples + 1);

  };
  for (let index = 0; index < objectives.length; index++) {
    const objective = objectives[index];
    assert.equal(await state('s.storyIndex'), index, objective.target);
    if (objective.type === 'ride') {
      await mount(); await place(objective.x, objective.y, true);
    } else if (objective.type === 'mount') {
      await dismount(); await mount();
    } else if (objective.type === 'race') {
      await runRace();
    } else if (objective.type === 'equip') {
      await press('o'); await click('#outfits-tab'); await click('#equip-sky'); await press('Escape');
    } else if (objective.type === 'decorate') {
      await press('h'); await click('#stable-tab'); await click('#decorate-window'); await press('Escape');
    } else {
      await dismount();
      const locations = { 'stable-keeper':[800,550], 'village-baker':[360,330], 'trail-guide':[250,280], 'stable-cat':[720,530], 'calico-cat':[450,410], 'gray-cat':[200,390], 'bakery-gift':[360,330] };
      const [x,y] = locations[objective.target] ?? [objective.x,objective.y];
      await place(x,y); await press('e');
      if (objective.type === 'shop') {
        await click('#browse-shop'); await screenshot('shop'); await click('#claim-outfit');
        assert.equal(await state('s.inventory.get("berry-gift")'), 1);
        await press('Escape');
      }
    }
    assert.equal(await state('s.storyIndex'), index + 1, `Completed ${objective.target}`);
    if (objective.type === 'inspect') {
      assert.equal(await evaluate('document.querySelector("dialog").open'), true);
      if (objective.target === 'fragment-meadow' || objective.target === 'birthday-finale') {
        const text = await evaluate('document.querySelector(".dialogue-copy").textContent');
        await reload();
        assert.equal(await state('s.storyIndex'), index + 1);
        assert.equal(await evaluate('document.querySelector(".dialogue-copy").textContent'), text);
      }
      if (objective.target === 'birthday-finale') {
        const gift = await evaluate(`import('/src/data/birthdayGift.ts').then(module=>module.birthdayGift)`);
        assert.ok(await evaluate(`document.querySelector('.dialogue-copy').textContent.includes(${JSON.stringify(gift.message)})`));
        await screenshot('finale');
      }
    }
    if (await evaluate('document.querySelector("dialog").open')) await press('Enter');
    if (objective.chapterEnd && objective.target !== 'birthday-finale') {
      await reload(); assert.equal(await state('s.storyIndex'), index + 1);
    }
  }
  assert.equal(await state('s.inventory.get("echo-fragment")'), 3);
  assert.equal(await state('s.inventory.get("echo-tack")'), 1);
  assert.equal(await state('s.inventory.get("teal-posy")'), 1);
  assert.equal(await state('s.inventory.get("horse-apple")'), 1);
  await press('o'); await click('#outfits-tab'); await click('#equip-birthday-teal'); await press('Escape');
  await press('h'); await click('#tack-tab');
  assert.ok(await evaluate('document.querySelector("dialog").textContent.includes("Fitted")'));
  await click('#stable-tab');
  for (let n=0; n<4 && await state('s.decorationSelections.get("window")') !== 'echo-lantern'; n++) await click('#decorate-window');
  assert.equal(await state('s.decorationSelections.get("window")'), 'echo-lantern'); await press('Escape');
  await reload();
  assert.deepEqual(await state('[s.outfitId,s.decorationSelections.get("window"),s.inventory.get("echo-tack")]'), ['birthday-teal','echo-lantern',1]);
  // Finished story remains free roam, with optional race retries.
  await mount(); await place(975,650,true); await press('r'); await click('#ready-race'); await waitForRace(); await press('e');
  assert.equal(await state('s.raceCheckpointIndex'), null);
  assert.equal(await state('s.checkpointMarkers.every(m=>!m.visible)'), true);
  // Ride a complete lap using real key events, routing around the clearing's obstacles.
  await press('e'); await press('r'); await click('#ready-race'); await waitForRace();
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
  await rideTo(930,940); await rideTo(1470,940); await rideTo(1500,430); await rideTo(1450,280); await rideTo(700,280);
  assert.equal(await evaluate('document.querySelector("#window-title").textContent'), 'A lovely ride!');
  await screenshot('ridden-race-results'); await click('#finish-race');
  // Mounted saves remain valid at the north boundary, with the rider still inside the world.
  await place(700,25,true); await wait(1100); await send('Page.reload'); await waitForMenu(); await press('Enter');
  assert.equal(await state('s.mounted'), true);
  assert.ok(await state('s.player.y>=14'));
  for (const [width, height] of [[1024,768],[1920,1080]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await press('o');
    assert.equal(await evaluate('(()=>{const r=document.querySelector("dialog").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()'), true);
    await screenshot(`wardrobe-${width}`); await press('Escape');
  }
  await wait(1100); await send('Page.reload'); await waitForMenu(); await press('Enter');
  assert.deepEqual(await state('[s.outfitId,s.appearanceId,s.storyIndex,s.inventory.get("horse-apple")]'), ['birthday-teal','chestnut',objectives.length,2]);
  assert.equal(await evaluate('document.querySelectorAll("dialog").length'), 1);
  assert.ok(await evaluate(`Array.from(document.images).every(img=>img.complete && img.naturalWidth>0)`));
  console.log('Observed browser FPS:', await evaluate('Math.round(window.__testGame.loop.actualFps)'));
  assert.deepEqual(errors, []);
  console.log('PASS: windows, focus, equip, dialogue, 38 story objectives (accelerated travel), rewards, shop, movement/braking/collisions, countdown, race pause/resume/finish/cancel, save reload, desktop layouts; no browser errors.');
} finally {
  socket?.close();
  browser.kill();
  await new Promise(resolve => browser.once('exit', resolve));
  rmSync(profile, { recursive: true, force: true });
}
