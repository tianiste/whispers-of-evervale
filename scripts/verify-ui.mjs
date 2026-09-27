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
    for (let attempt=0; attempt<100 && !(await evaluate(`window.__testGame?.scene.isActive('MainMenu')`)); attempt++) await wait(100);
    assert.equal(await evaluate(`window.__testGame?.scene.isActive('MainMenu')`), true, JSON.stringify(errors));
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
  await press('o'); await click('#equip-berry');
  assert.equal(await state('s.outfitId'), 'berry');
  assert.equal(await evaluate('document.querySelector("#equip-berry").getAttribute("aria-pressed")'), 'true');
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
  await place(850, 550); await press('e');
  assert.equal(await state('s.questIndex'), 1);
  await screenshot('dialogue'); await press('Enter');
  assert.equal(await evaluate('document.querySelector("dialog").open'), false);
  await place(1300, 420); await place(1320, 820); await press('e');
  assert.equal(await state('s.inventory.get("wildflower")'), 1);
  await place(975, 650); await press('e');
  assert.equal(await state('s.mounted'), true);
  assert.equal(await state('s.questIndex'), 4);
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
  assert.equal(await state('s.inventory.get("horse-apple")'), 2);
  assert.equal(await evaluate('document.querySelector("#window-title").textContent'), 'A lovely ride!');
  await screenshot('results'); await click('#finish-race');
  assert.equal(await evaluate('document.querySelector(".race-hud").hidden'), true);
  assert.equal(await state('s.checkpointMarkers.every(m=>!m.visible)'), true);
  await press('e'); assert.equal(await state('s.mounted'), false);
  await place(800, 550); await press('e'); await press('Enter');
  await place(250, 280); await screenshot('village'); await press('e'); await press('Enter');
  await place(1400, 320); await wait(1500); await screenshot('echo'); await place(1480, 300); assert.equal(await state('s.echoQuestIndex'), 3);
  assert.equal(await state('s.activeDialogueId'), 'birthday-finale'); await screenshot('finale'); await press('Enter');
  await place(360, 330); await press('e'); await click('#browse-shop'); await screenshot('shop'); await click('#leave-shop');
  await press('i'); assert.ok(await evaluate('document.querySelector("dialog").textContent.includes("Horse Apple")')); await press('Escape');
  // Race cancellation must remove all race presentation.
  await place(700, 280); await press('e'); await place(975, 650, true); await press('r'); await click('#ready-race'); await wait(3150); await press('e');
  assert.equal(await state('s.raceCheckpointIndex'), null);
  assert.equal(await state('s.checkpointMarkers.every(m=>!m.visible)'), true);
  // Ride a complete lap using real key events, routing around the clearing's obstacles.
  await press('e'); await press('r'); await click('#ready-race'); await wait(3150);
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
  assert.deepEqual(await state('[s.outfitId,s.appearanceId,s.questIndex,s.echoQuestIndex,s.inventory.get("horse-apple")]'), ['berry','chestnut',4,3,4]);
  assert.equal(await evaluate('document.querySelectorAll("dialog").length'), 1);
  assert.ok(await evaluate(`Array.from(document.images).every(img=>img.complete && img.naturalWidth>0)`));
  console.log('Observed browser FPS:', await evaluate('Math.round(window.__testGame.loop.actualFps)'));
  assert.deepEqual(errors, []);
  console.log('PASS: windows, focus, equip, dialogue, quests/rewards, shop, movement/braking/collisions, countdown, race pause/resume/finish/cancel, save reload, desktop layouts; no browser errors.');
} finally {
  socket?.close();
  browser.kill();
  await new Promise(resolve => browser.once('exit', resolve));
  rmSync(profile, { recursive: true, force: true });
}
