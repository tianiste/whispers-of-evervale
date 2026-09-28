// Data contracts and legacy-save migration; uses the project's installed TypeScript compiler.
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const compiled = await mkdtemp(join(tmpdir(), 'evervale-content-'));
try {
  await writeFile(join(compiled, 'package.json'), '{"type":"module"}');
  for (const folder of ['data', 'config']) {
    await mkdir(join(compiled, folder));
    for (const name of await readdir(new URL(`../src/${folder}/`, import.meta.url))) {
      if (!name.endsWith('.ts')) continue;
      const source = await readFile(new URL(`../src/${folder}/${name}`, import.meta.url), 'utf8');
      const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
        .replace(/from (['"])(\.[^'"]+)\1/g, 'from $1$2.js$1');
      await writeFile(join(compiled, folder, name.replace(/\.ts$/, '.js')), js);
    }
  }
  const load = name => import(pathToFileURL(join(compiled, name)).href);
  const { storyChapters, storyObjectives } = await load('data/story.js');
  const { clearingRace } = await load('data/race.js');
  const { parseGameSave } = await load('data/save.js');
  const { WORLD_WIDTH, WORLD_HEIGHT } = await load('config/world.js');
  assert.ok(storyChapters.length >= 8 && storyChapters.length <= 12);
  assert.equal(new Set(storyObjectives.map(o => o.id)).size, storyObjectives.length);
  const types = new Set(storyObjectives.map(o => o.type));
  for (const type of ['ride', 'race', 'equip', 'decorate', 'cat', 'inspect', 'trail', 'care']) assert.ok(types.has(type));
  let previous = { x: 900, y: 550 }, distance = 0;
  const bounded = p => assert.ok(p.x >= 100 && p.y >= 100 && p.x < WORLD_WIDTH - 100 && p.y < WORLD_HEIGHT - 100, JSON.stringify(p));
  for (const o of storyObjectives) {
    if (o.x !== undefined) bounded(o);
    assert.ok(o.description.length < 180);
    assert.ok((o.payoff?.split(/\s+/).length ?? 0) < 65, o.id);
    if (o.points) {
      assert.ok(o.points.length > 0);
      assert.equal(new Set(o.points.map(p => p.id)).size, o.points.length);
      o.points.forEach(bounded);
      if (o.type !== 'trail') {
        assert.ok(Math.max(...o.points.map(p => p.x)) - Math.min(...o.points.map(p => p.x)) < 1200);
        assert.ok(Math.max(...o.points.map(p => p.y)) - Math.min(...o.points.map(p => p.y)) < 1200);
      }
    }
    const path = o.type === 'race' ? [clearingRace.start, ...clearingRace.checkpoints] : o.type === 'trail' ? o.points : o.type === 'ride' ? [o] : [];
    for (const p of path) { distance += Math.hypot(p.x - previous.x, p.y - previous.y); previous = p; }
    if (!path.length && o.x !== undefined) previous = o;
  }
  const movingMinutes = distance / 330 / 60;
  assert.ok(movingMinutes > 10 && movingMinutes < 55, `Riding budget ${movingMinutes}`);
  const save = {
    version: 1, appearanceId: 'cream', horseId: 'brown-quarter-horse', player: { x: 900, y: 550 }, horse: { x: 975, y: 650 }, mounted: false,
    outfitId: 'meadow', storyIndex: 0, storyTarget: storyObjectives[0].id, activityProgress: [], dialogueTarget: null,
    firstRideIndex: 0, echoQuestIndex: 0, inventory: {}, decorations: { window: 'flower-box', door: 'lantern', sign: 'wreath' },
    race: { checkpointIndex: null, elapsedMs: 0, resultText: '' }, dialogue: null,
  };
  const parse = data => parseGameSave(JSON.stringify(data));
  assert.ok(parse(save));
  const legacy = { ...save }; delete legacy.storyTarget; delete legacy.activityProgress; delete legacy.dialogueTarget;
  for (const [index, chapter] of [[2, 'Welcome to Evervale'], [8, 'The First Ride'], [16, 'First Race']]) {
    assert.equal(parse({ ...legacy, storyIndex: index }).storyTarget, `${chapter}:chosen-horse`);
  }
  assert.equal(parse({ ...legacy, storyIndex: 38 }).storyIndex, storyObjectives.length);
  const inspecting = parse({ ...legacy, storyIndex: 11, dialogue: 'story-inspect' });
  assert.equal(inspecting.dialogueTarget, 'The First Ride:roadside-posy');
  assert.equal(inspecting.storyTarget, 'The First Ride:village-arrival');
  for (const type of ['trail', 'care']) {
    const index = storyObjectives.findIndex(o => o.type === type && (o.points?.length ?? 3) > 1);
    const o = storyObjectives[index], ids = o.points?.map(p => p.id) ?? ['brush', 'water', 'treat'];
    const current = { ...save, storyIndex: index, storyTarget: o.id, activityProgress: [ids[0]] };
    assert.deepEqual(parse(current).activityProgress, [ids[0]]);
    for (const progress of [null, 42, ['unknown'], [ids[0], ids[0]], ids]) assert.equal(parse({ ...current, activityProgress: progress }), null);
    if (type === 'trail' || type === 'pattern') assert.equal(parse({ ...current, activityProgress: [ids[1]] }), null);
    else assert.ok(parse({ ...current, activityProgress: [ids[1]] }));
  }
  for (const index of [null, -1, 1.5, storyObjectives.length + 1]) assert.equal(parse({ ...save, storyIndex: index }), null);
  console.log(`PASS: ${storyChapters.length} chapters, ${storyObjectives.length} objectives, activity contracts, legacy save migration; ${Math.round(distance).toLocaleString()}px / ${movingMinutes.toFixed(1)}min nominal mounted travel (not a playtime claim).`);
} finally { await rm(compiled, { recursive: true, force: true }); }
