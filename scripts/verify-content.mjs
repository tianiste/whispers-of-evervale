// Data contracts and save validation; uses the project's installed TypeScript compiler.
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
  const { storyChapters, storyObjectives, activityIds } = await load('data/story.js');
  const { echoes, plannedEchoes, echoTotal, wrongAnswerLines } = await load('data/echoes.js');
  const { parseGameSave } = await load('data/save.js');
  const { items } = await load('data/items.js');
  const { decorations } = await load('data/decorations.js');
  const { horses, cleanHorseName } = await load('data/horses.js');
  const { villageCats } = await load('data/village.js');
  const { WORLD_WIDTH, WORLD_HEIGHT } = await load('config/world.js');
  const itemIds = new Set(items.map(item => item.id));

  // Campaign shape: opening quests, three Echoes, a stirring beat, and no finale yet.
  assert.ok(storyChapters.length >= 10 && storyChapters.length <= 14, `${storyChapters.length} chapters`);
  assert.deepEqual(storyChapters.slice(0, 3).map(c => c.name), ['Welcome to Sunmeadow', 'Meet Your Horse', 'Make It Yours']);
  assert.equal(new Set(storyObjectives.map(o => o.id)).size, storyObjectives.length);
  assert.ok(!storyObjectives.some(o => o.target === 'birthday-finale'), 'Birthday finale is reserved for Echo VI');
  assert.equal(storyChapters.at(-1).name, 'More Echoes Are Stirring');
  const types = new Set(storyObjectives.map(o => o.type));
  for (const type of ['choose-horse', 'mount', 'ride', 'care', 'equip', 'decorate', 'cat', 'race', 'trail', 'echo']) assert.ok(types.has(type), type);
  assert.equal(storyObjectives.findIndex(o => o.type === 'cat'), storyObjectives.findIndex(o => o.chapter === 'Welcome to Sunmeadow' && o.type === 'cat'));
  assert.ok(storyObjectives.findIndex(o => o.type === 'choose-horse') < storyObjectives.findIndex(o => o.type === 'mount'), 'Horse is chosen before mounting');
  const bounded = (p, label) => assert.ok(p.x >= 50 && p.y >= 50 && p.x <= WORLD_WIDTH - 50 && p.y <= WORLD_HEIGHT - 50, `${label} ${JSON.stringify(p)}`);
  for (const o of storyObjectives) {
    if (o.x !== undefined) bounded(o, o.id);
    assert.ok(o.description.length < 120, o.id);
    assert.ok((o.payoff?.split(/\s+/).length ?? 0) < 45, o.id);
    if (o.type === 'trail') {
      assert.ok(o.points.length >= 3 && new Set(o.points.map(p => p.id)).size === o.points.length, o.id);
      o.points.forEach(p => bounded(p, o.id));
    }
    if (o.type === 'cat') assert.ok(villageCats.some(cat => cat.id === o.target), o.id);
  }

  // Echoes: data-driven, one story objective each, affectionate retryable questions.
  assert.deepEqual(echoes.map(e => e.numeral), ['I', 'II', 'III']);
  assert.deepEqual(plannedEchoes.map(e => e.numeral), ['IV', 'V', 'VI']);
  assert.equal(echoTotal, 6);
  assert.ok(wrongAnswerLines.includes('The Echo seems unconvinced.'));
  for (const echo of echoes) {
    const objectives = storyObjectives.filter(o => o.type === 'echo' && o.target === echo.id);
    assert.equal(objectives.length, 1, echo.id);
    assert.deepEqual({ x: objectives[0].x, y: objectives[0].y }, { x: echo.site.x, y: echo.site.y });
    bounded(echo.site, echo.id);
    assert.ok(itemIds.has(echo.reward), echo.id);
    assert.ok(decorations.some(d => d.unlockItem === echo.reward), `${echo.id} reward unlocks a decoration`);
    assert.ok(echo.intro.length >= 1 && echo.intro.length <= 3 && echo.completion.length >= 1 && echo.reflection, echo.id);
    assert.equal(new Set(echo.steps.map(s => s.id)).size, echo.steps.length);
    for (const step of echo.steps) {
      if (step.kind === 'quiz') {
        assert.equal(step.options.filter(o => o.correct).length, 1, step.id);
        assert.ok(step.options.length >= 3 && step.options.every(o => o.response), step.id);
      } else {
        assert.ok(step.pairs.length >= 3 && new Set(step.pairs.map(p => p.right)).size === step.pairs.length, step.id);
        assert.ok(step.misses.length >= 3 && step.solved, step.id);
      }
    }
  }
  const text = JSON.stringify(echoes);
  for (const needle of ['Maj', 'Tilen', 'left cheek', 'cigarette', 'GEN-I', 'warehouse', 'sea', 'Brawl Stars', 'Water', 'Banjole', 'Half a mattress']) assert.ok(text.includes(needle), needle);
  assert.ok(!text.includes('HardBeats'), 'No venue branding');
  const spark = echoes[0].steps;
  assert.equal(spark[0].options.find(o => o.correct).text, 'Maj, Tilen and a few friends');
  assert.equal(echoes[1].steps.find(s => s.kind === 'quiz').options.find(o => o.correct).text, 'Going to the sea together');
  assert.deepEqual(echoes[2].steps.map(s => s.options.find(o => o.correct).text), ['Brawl Stars', 'Water']);
  assert.ok((text.match(/Banca/g) ?? []).length <= 1 && (text.match(/Baber/g) ?? []).length <= 1, 'Nicknames stay rare');

  // Horses and cats.
  assert.deepEqual([horses[0].breed, horses[0].name], ['Quarter Horse', 'Sky']);
  assert.equal(cleanHorseName('  Sky   Blue <b> '), 'Sky Blue b');
  assert.equal(cleanHorseName('x'.repeat(40)).length, 16);
  assert.deepEqual(villageCats.map(cat => cat.name).sort(), ['Maco', 'Maks', 'Miki', 'Nomi', 'Viski']);
  for (const cat of villageCats) bounded(cat, cat.id);

  // Saves.
  const base = {
    version: 1, appearanceId: 'cream', horseId: 'brown-quarter-horse', horseName: null, player: { x: 900, y: 550 }, horse: { x: 975, y: 650 }, mounted: false,
    outfitId: 'meadow', storyIndex: 0, storyTarget: storyObjectives[0].id, activityProgress: [], dialogueTarget: null, restoredEchoes: [], echoProgress: null,
    firstRideIndex: 0, echoQuestIndex: 0, inventory: {}, decorations: { window: 'flower-box', door: 'lantern', sign: 'wreath' },
    race: { checkpointIndex: null, elapsedMs: 0, resultText: '' }, dialogue: null,
  };
  const parse = data => parseGameSave(JSON.stringify(data));
  assert.deepEqual(parse(base), base);
  assert.equal(parse({ ...base, mounted: true }), null, 'No riding before choosing a horse');
  for (const horseName of ['', 'x'.repeat(17), '<b>', 42]) assert.equal(parse({ ...base, horseName }), null, JSON.stringify(horseName));
  assert.equal(parse({ ...base, horseName: 'Sky' }).horseName, 'Sky');
  const legacy = { ...base }; for (const key of ['storyTarget', 'activityProgress', 'dialogueTarget', 'restoredEchoes', 'echoProgress', 'horseName']) delete legacy[key];
  const migrated = parse({ ...legacy, horseId: 'gray-mustang', storyIndex: 4 });
  assert.deepEqual([migrated.horseName, migrated.storyIndex, migrated.restoredEchoes, migrated.echoProgress], ['Silver', 4, [], null]);
  const echoIndex = storyObjectives.findIndex(o => o.type === 'echo' && o.target === 'break');
  assert.equal(parse({ ...base, horseName: 'Sky', storyIndex: 2, storyTarget: storyObjectives[echoIndex].id }).storyIndex, echoIndex, 'Objective ID wins over index');
  assert.equal(parse({ ...base, storyIndex: 3, storyTarget: 'Removed chapter:gone' }).storyIndex, 3);
  for (const index of [null, -1, 1.5, storyObjectives.length + 1]) assert.equal(parse({ ...base, storyIndex: index, storyTarget: undefined }), null);

  for (const type of ['trail', 'care']) {
    const index = storyObjectives.findIndex(o => o.type === type);
    const ids = activityIds(storyObjectives[index]);
    const current = { ...base, horseName: 'Sky', storyIndex: index, storyTarget: storyObjectives[index].id };
    assert.deepEqual(parse({ ...current, activityProgress: [ids[0]] }).activityProgress, [ids[0]]);
    for (const progress of [null, 42, ['unknown'], [ids[0], ids[0]], ids]) assert.equal(parse({ ...current, activityProgress: progress }), null, `${type} ${JSON.stringify(progress)}`);
    if (type === 'trail') assert.equal(parse({ ...current, activityProgress: [ids[1]] }), null, 'Trail waymarks are ordered');
    else assert.ok(parse({ ...current, activityProgress: [ids[1]] }));
  }
  assert.equal(parse({ ...base, activityProgress: ['brush'] }), null, 'Progress belongs to the current objective');

  assert.deepEqual(parse({ ...base, restoredEchoes: ['spark', 'break'] }).restoredEchoes, ['spark', 'break']);
  for (const restoredEchoes of [['spark', 'spark'], ['nope'], 'spark']) assert.equal(parse({ ...base, restoredEchoes }), null);
  assert.deepEqual(parse({ ...base, echoProgress: { id: 'spark', steps: ['crowd'] } }).echoProgress, { id: 'spark', steps: ['crowd'] });
  for (const echoProgress of [{ id: 'spark', steps: ['impression'] }, { id: 'nope', steps: [] }, { id: 'spark', steps: ['crowd', 'crowd'] }, { id: 'spark' }])
    assert.equal(parse({ ...base, echoProgress }), null, JSON.stringify(echoProgress));
  assert.equal(parse({ ...base, restoredEchoes: ['spark'], echoProgress: { id: 'spark', steps: [] } }), null, 'Restored Echoes cannot be in progress');

  const afterEcho = storyObjectives[echoIndex];
  const reflecting = { ...base, horseName: 'Sky', storyIndex: echoIndex + 1, storyTarget: storyObjectives[echoIndex + 1].id, restoredEchoes: ['spark', 'break'], dialogue: 'echo-reflection', dialogueTarget: afterEcho.id };
  assert.ok(parse(reflecting));
  assert.equal(parse({ ...reflecting, dialogueTarget: storyObjectives[0].id }), null);
  assert.equal(parse({ ...reflecting, dialogueTarget: 'Nope:nothing' }), null);

  const done = parse({ ...base, horseName: 'Sky', storyIndex: storyObjectives.length, storyTarget: 'complete', restoredEchoes: ['spark', 'break', 'half-bed'] });
  assert.equal(done.storyIndex, storyObjectives.length);
  console.log(`PASS: ${storyChapters.length} chapters, ${storyObjectives.length} objectives, ${echoes.length} playable Echoes + ${plannedEchoes.length} planned, horses, cats, save validation and migration.`);
} finally { await rm(compiled, { recursive: true, force: true }); }
