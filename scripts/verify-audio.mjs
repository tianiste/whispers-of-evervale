// Run Vite first, then node scripts/verify-audio.mjs (Node 22+, CHROMIUM optional).
// Isolated profile, trusted CDP input, and a test-only intercepted game handle.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.env.GAME_URL ?? 'http://127.0.0.1:5173';
const profile = mkdtempSync(join(tmpdir(), 'evervale-audio-'));
const browser = spawn(process.env.CHROMIUM ?? 'chromium', ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=user-gesture-required', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank']);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
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
  const pending = new Map(), errors = [];
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  socket.onmessage = async ({ data }) => {
    const message = JSON.parse(data), params = message.params;
    if (message.id) {
      const result = pending.get(message.id); pending.delete(message.id);
      if (message.error) result?.reject(Error(JSON.stringify(message.error))); else result?.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') errors.push(params.exceptionDetails.exception?.description ?? params.exceptionDetails.text);
    else if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(params.type)) errors.push(params.args.map(a => a.value ?? a.description).join(' '));
    else if (message.method === 'Network.responseReceived' && params.response.status >= 400) errors.push(`${params.response.status} ${params.response.url}`);
    else if (message.method === 'Network.loadingFailed' && !params.canceled) errors.push(params.errorText);
    else if (message.method === 'Log.entryAdded' && params.entry.level === 'error') errors.push(params.entry.text);
    else if (message.method === 'Fetch.requestPaused') {
      try {
        const source = await (await fetch(params.request.url)).text();
        const instrumented = params.request.url.includes('/src/main.ts')
          ? source.replace('new Phaser.Game(', 'window.__testGame = new Phaser.Game(')
          : source + '\nwindow.__testAudio = audio;';
        await send('Fetch.fulfillRequest', { requestId: params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }], body: Buffer.from(instrumented).toString('base64') });
      } catch (error) { errors.push(String(error)); }
    }
  };
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const waitFor = async (expression, label) => {
    for (let i = 0; i < 150; i++) {
      try { if (await evaluate(expression)) return; }
      catch (error) { if (!/Execution context was destroyed|Cannot find context|Inspected target navigated/.test(String(error))) throw error; }
      await wait(100);
    }
    assert.fail(`${label}: ${JSON.stringify(errors)}`);
  };
  const mixer = expression => evaluate(`(()=>{const m=window.__testAudio(window.__testGame.scene.getScene('MainMenu'));return (${expression})})()`);
  const ready = async () => {
    await waitFor(`window.__testGame?.scene.isActive('MainMenu')`, 'Menu loads');
    await mixer('(window.__m = m, true)');
  };
  const click = async (x, y) => {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  };
  const clickObject = async (scene, name) => {
    const point = await evaluate(`(()=>{const o=window.__testGame.scene.getScene('${scene}').children.getByName('${name}');const r=document.querySelector('canvas').getBoundingClientRect();return {x:r.x+o.x*r.width/960,y:r.y+o.y*r.height/540}})()`);
    await click(point.x, point.y);
  };
  await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable'); await send('Page.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*/src/main.ts*' }, { urlPattern: '*/src/systems/audio.ts*' }] });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url }); await ready();
  assert.equal(await mixer('m.unlocked'), false, 'No untrusted autoplay');
  assert.equal(await mixer('m.beds.length'), 0, 'No beds before input');
  await click(20, 20);
  await waitFor('window.__m.unlocked && window.__m.context.state === "running" && window.__m.beds.length === 2', 'First pointer unlocks music and ambience');
  console.log('PASS first trusted pointer unlock');

  // Keep all buses rendering while measuring scheduled AudioParam changes.
  await mixer(`(()=>{const o=m.context.createOscillator(),g=m.context.createGain();g.gain.value=.003;o.connect(g);g.connect(m.buses.get('effects'));o.start();window.__probe={o,g};const a=m.context.createAnalyser();a.fftSize=2048;m.sound.masterVolumeNode.connect(a);window.__analyzer=a;window.__peak=()=>{const samples=new Float32Array(a.fftSize);a.getFloatTimeDomainData(samples);return samples.reduce((max,n)=>Math.max(max,Math.abs(n)),0)};return true})()`);
  await waitFor('window.__peak() > .00001', 'Actual output is audible');
  for (const key of ['volume', 'music', 'effects', 'ambience']) {
    await mixer(`m.set('${key}',0)`);
    const value = key === 'volume' ? 'window.__m.sound.masterVolumeNode.gain.value' : `window.__m.buses.get('${key}').gain.value`;
    await waitFor(`${value}<.00001`, `${key} reaches zero in active graph`);
    if (key === 'volume') await waitFor('window.__peak()<.000001', 'Master zero silences actual output');
    assert.equal(await mixer(`m.settings.${key}`), 0);
    await mixer(`m.set('${key}',.7)`);
    await waitFor(`${value}>.69`, `${key} restores active output`);
  }
  await mixer("m.set('muted',true)");
  await waitFor('window.__peak()<.000001', 'Mute silences actual output');
  await mixer("m.set('muted',false)");
  await waitFor('window.__peak()>.00001', 'Unmute restores output');
  console.log('PASS category zeros, master zero, and actual-output mute/unmute');

  await mixer(`(()=>{for(const key of ['volume','music','effects','ambience'])m.set(key,1);return true})()`);
  await waitFor('window.__m.voices===0 && [...window.__m.buses.values()].every(bus=>bus.gain.value>.99)', 'Full-volume mix ready');
  const duplicates = await mixer(`(()=>{for(let i=0;i<100;i++)m.cue('hoof');return m.voices})()`);
  assert.equal(duplicates, 1, 'Duplicate burst creates one voice');
  const burst = await evaluate(`import('/src/data/audio.ts').then(async({cues})=>{let voices=0,peak=0;for(let i=0;i<10;i++)for(const name of Object.keys(cues)){window.__m.cue(name);voices=Math.max(voices,window.__m.voices)}const until=performance.now()+1000;do{peak=Math.max(peak,window.__peak());await new Promise(resolve=>setTimeout(resolve,16))}while(performance.now()<until);return {voices,peak}})`);
  assert.ok(burst.voices > 1 && burst.voices <= 16, `Voice ceiling: ${burst.voices}`);
  assert.ok(Number.isFinite(burst.peak) && burst.peak > .00001 && burst.peak < 1, `Full-volume mixed output stays finite, audible, and below clipping: ${burst.peak}`);
  await waitFor('window.__m.voices===0', 'Burst sources release');
  console.log(`PASS duplicate throttle, 16-voice cap, one-shot release; full-volume mixed burst peak ${burst.peak.toFixed(4)} < 1`);

  await mixer(`(()=>{window.__oldBeds=[...m.beds];window.__ended=0;for(const b of window.__oldBeds)b.source.addEventListener('ended',()=>window.__ended++);m.atmosphere(window.__testGame.scene.getScene('MainMenu'),'race-forest');return true})()`);
  assert.equal(await mixer('m.beds.length'), 2);
  assert.equal(await mixer('m.beds[0]===window.__oldBeds[0]'), false);
  assert.ok(await mixer('window.__oldBeds[0].gain.gain.value>0'), 'Previous bed remains audible at crossfade start');
  await mixer(`(()=>{window.__sameBeds=[...m.beds];m.atmosphere(window.__testGame.scene.getScene('MainMenu'),'race-forest');return true})()`);
  assert.equal(await mixer('m.beds.every((bed,i)=>bed===window.__sameBeds[i])'), true, 'Repeated profile does not restart');
  await waitFor('window.__ended===2', 'Crossfaded sources end');
  await waitFor('window.__m.beds.every(b=>b.gain.gain.value>.99)', 'New beds fade fully in');
  console.log('PASS profile crossfade, outgoing cleanup, repeated-profile continuity');

  // Inspect every generated cue/profile directly, without emitting a noisy audition.
  const waveforms = await evaluate(`import('/src/data/audio.ts').then(({cues,soundscapes})=>{const m=window.__m;let count=0,peak=0;const bad=[];const inspect=(name,buffer)=>{let max=0,finite=true;for(const sample of buffer.getChannelData(0)){finite=finite&&Number.isFinite(sample);max=Math.max(max,Math.abs(sample))}if(!finite||max>=1||max<.000001)bad.push({name,max,finite});count++;peak=Math.max(peak,max)};for(const [name,definition]of Object.entries(cues))inspect(name,m.makeCue(definition,name));for(const name of Object.keys(soundscapes))for(const bus of ['music','ambience'])inspect(name+'-'+bus,m.makeBed(name,bus));return {count,peak,bad}})`);
  assert.deepEqual(waveforms.bad, []);
  assert.ok(waveforms.count > 20);
  console.log(`PASS ${waveforms.count} generated buffers: finite, non-silent, peak ${waveforms.peak.toFixed(3)} < 1`);

  const saved = { volume: .43, music: 0, effects: .27, ambience: .61, muted: true };
  await mixer(`(()=>{for(const [key,value]of Object.entries(${JSON.stringify(saved)}))m.set(key,value);window.__probe.o.stop();window.__probe.o.disconnect();window.__probe.g.disconnect();return true})()`);
  await evaluate('window.__reloadMarker=true');
  await send('Page.reload');
  await waitFor('window.__reloadMarker===undefined', 'Refresh replaces execution context');
  await ready();
  assert.deepEqual(await mixer('m.settings'), saved, 'Every setting survives refresh');
  assert.equal(await mixer('m.unlocked'), false, 'Refresh again waits for interaction');
  await clickObject('MainMenu', 'menu-new');
  await waitFor(`window.__testGame.scene.isActive('CharacterCreator')`, 'New Game enters creator');
  assert.deepEqual(await mixer('m.settings'), saved, 'New Game retains all settings');
  console.log('PASS refresh and New Game retain volumes and mute');

  // Empty scene handoffs intentionally retain the current bed; game destruction must release it.
  await mixer(`(()=>{window.__cleanup={stopped:0,disconnected:0};for(const b of m.beds){const stop=b.source.stop.bind(b.source);b.source.stop=(...args)=>{window.__cleanup.stopped++;return stop(...args)}}for(const bus of m.buses.values()){const disconnect=bus.disconnect.bind(bus);bus.disconnect=(...args)=>{window.__cleanup.disconnected++;return disconnect(...args)}}return true})()`);
  await evaluate('window.__testGame.destroy(true)');
  await waitFor('window.__cleanup.stopped===2 && window.__cleanup.disconnected===3', 'Game destruction releases beds and buses');
  assert.deepEqual(errors, [], 'No console warnings/errors or failed assets');
  console.log('PASS game-destruction bed/bus cleanup; no browser errors or missing assets');
} finally {
  socket?.close();
  if (browser.exitCode === null) { const exited = new Promise(resolve => browser.once('exit', resolve)); browser.kill(); await exited; }
  rmSync(profile, { recursive: true, force: true });
}
