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
  const { echoes, echoTotal, wrongAnswerLines } = await load('data/echoes.js');
  const { giftConfig, birthdayCard, birthdayReveal, birthdayGifts } = await load('data/birthdayGift.js');
  const { parseGameSave } = await load('data/save.js');
  const { items } = await load('data/items.js');
  const { decorations } = await load('data/decorations.js');
  const { horses, cleanHorseName } = await load('data/horses.js');
  const { villageCats, villagers, bolt, catCompletion } = await load('data/village.js');
  const { raceTracks, obstacleShapes, raceThemes } = await load('data/race.js');
  const { accessories, outfitTags, styleParade } = await load('data/fashion.js');
  const echoGames = await load('data/echoGames.js');
  const { WORLD_WIDTH, WORLD_HEIGHT } = await load('config/world.js');
  const itemIds = new Set(items.map(item => item.id));

  // Campaign shape: opening quests, six Echoes, a stirring beat, and Echo VI with the birthday finale last.
  assert.ok(storyChapters.length >= 10 && storyChapters.length <= 14, `${storyChapters.length} chapters`);
  assert.deepEqual(storyChapters.slice(0, 3).map(c => c.name), ['Welcome to Sunmeadow', 'Meet Your Horse', 'Make It Yours']);
  assert.equal(new Set(storyObjectives.map(o => o.id)).size, storyObjectives.length);
  assert.ok(!storyObjectives.some(o => o.target === 'birthday-finale'), 'The birthday finale belongs to Echo VI, not a story objective');
  assert.deepEqual(storyChapters.slice(-2).map(c => c.name), ['More Echoes Are Stirring', 'Echo VI — Not Yet']);
  const types = new Set(storyObjectives.map(o => o.type));
  for (const type of ['choose-horse', 'mount', 'ride', 'care', 'groom', 'equip', 'decorate', 'cat', 'pet', 'race', 'fashion', 'trail', 'echo']) assert.ok(types.has(type), type);
  assert.ok(storyObjectives.findIndex(o => o.type === 'care') < storyObjectives.findIndex(o => o.type === 'groom'), 'Grooming is introduced in Meet Your Horse first');
  const stirring = storyChapters.at(-2);
  assert.ok(stirring.payoff.includes('5 / 6') && /one echo remains/i.test(stirring.payoff) && stirring.payoff.includes('different'), 'The oak is a waypoint, not an ending');
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
    if (o.type === 'pet') assert.equal(o.target, bolt.id, o.id);
    if (o.type === 'race') assert.ok(raceTracks.some(track => track.id === o.target), o.id);
    if (o.type === 'decorate' && o.target !== 'any-slot') assert.ok(decorations.some(d => d.id === o.target && d.unlockItem), o.id);
    if (o.type === 'talk' && o.target !== 'stable-keeper') assert.ok(villagers.some(v => v.id === o.target), o.id);
  }
  assert.deepEqual(storyObjectives.filter(o => o.type === 'race').map(o => o.target), ['meadow-sprint', 'forest-run'], 'Story races');
  const decorateTray = storyObjectives.findIndex(o => o.type === 'decorate' && o.target === 'foil-tray');
  assert.ok(decorateTray > storyObjectives.findIndex(o => o.type === 'echo' && o.target === 'cuisine'), 'The foil tray is hung after Echo IV');

  // Echoes: data-driven, one story objective each, affectionate retryable questions and canvas games.
  assert.deepEqual(echoes.map(e => e.numeral), ['I', 'II', 'III', 'IV', 'V', 'VI']);
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
      if (step.kind === 'quiz' && step.open) {
        assert.equal(step.options.filter(o => o.correct).length, 0, `${step.id} has no wrong answers`);
        assert.ok(step.options.length >= 3, step.id);
      } else if (step.kind === 'quiz') {
        assert.equal(step.options.filter(o => o.correct).length, 1, step.id);
        assert.ok(step.options.length >= 3 && step.options.every(o => o.response), step.id);
      } else if (step.kind === 'match') {
        assert.ok(step.pairs.length >= 3 && new Set(step.pairs.map(p => p.right)).size === step.pairs.length, step.id);
        assert.ok(step.misses.length >= 3 && step.solved, step.id);
      } else {
        assert.ok(step.intro && step.solved, step.id);
        if (step.kind === 'reconstruct') assert.ok(step.fragments.length >= 3 && step.fragments.length <= 6 && step.misses.length >= 2, step.id);
        else assert.ok(['holiday-map', 'creature-catch', 'foil-tray', 'card-pack', 'snowball', 'orehi', 'future-home'].includes(step.game), step.id);
      }
    }
  }
  const text = JSON.stringify(echoes);
  for (const needle of ['Maj', 'Tilen', 'left cheek', 'cigarette', 'GEN-I', 'warehouse', 'sea', 'Brawl Stars', 'Water', 'Banjole', 'Half a mattress',
    'We want lasagne. We do not own the correct tray.', 'aluminium foil', 'tacos', 'special cookies', 'Christmas Eve', 'orehi with Nutella']) assert.ok(text.includes(needle), needle);
  const games = JSON.stringify(echoGames);
  for (const needle of ['STRUCTURAL INTEGRITY: QUESTIONABLE', 'LASAGNE COMPATIBILITY: ACCEPTABLE', 'Banca', 'Nutella', 'Christmas Eve']) assert.ok(games.includes(needle), needle);
  assert.ok(!/pok[eé]mon|pikachu|poké ?ball/i.test(text + games), 'No franchise names in Echo content');
  assert.deepEqual(echoes.filter(e => e.id === 'cuisine' || e.id === 'first-winter').map(e => e.steps.filter(s => s.kind === 'play' || s.kind === 'reconstruct').length), [4, 3], 'Echo IV and V are mostly play');
  const everything = JSON.stringify({ storyChapters, echoes, echoGames, styleParade, villagers });
  assert.equal((everything.match(/absolutely horrid, darling/gi) ?? []).length, 1, '"Absolutely horrid, darling" appears exactly once');
  assert.ok(styleParade.intro.includes('Absolutely horrid, darling'), 'The parade judge says it');
  assert.ok(!text.includes('HardBeats'), 'No venue branding');
  const spark = echoes[0].steps;
  assert.equal(spark[0].options.find(o => o.correct).text, 'Maj, Tilen and a few friends');
  assert.equal(echoes[1].steps.find(s => s.kind === 'quiz').options.find(o => o.correct).text, 'Going to the sea together');
  assert.deepEqual(echoes[2].steps.map(s => s.options.find(o => o.correct).text), ['Brawl Stars', 'Water']);
  assert.ok((text.match(/Banca/g) ?? []).length <= 1 && (text.match(/Baber/g) ?? []).length <= 1, 'Nicknames stay rare');

  // Echo VI: a future memory at the stable, open questions, then the birthday finale.
  const future = echoes.at(-1);
  assert.equal(future.id, 'future');
  assert.ok(future.finale && echoes.filter(e => e.finale).length === 1, 'Only Echo VI ends in the finale');
  assert.equal(future.memoryDate, 'MEMORY DATE: UNKNOWN');
  assert.ok(future.prelude.includes('This memory has not happened yet.'));
  assert.deepEqual([...future.completion], ['There isn’t a correct answer yet.', 'We still have to make this one.']);
  const futureQuizzes = future.steps.filter(s => s.kind === 'quiz');
  assert.ok(futureQuizzes.length === 3 && futureQuizzes.every(q => q.open), 'Every future question accepts every answer');
  assert.equal(futureQuizzes[0].question, 'How many cats are too many?');
  assert.ok(futureQuizzes[0].options.some(o => o.text === 'There is no such number') && futureQuizzes[1].options.some(o => o.text === 'All of the above'));
  assert.equal(futureQuizzes[2].question, 'How long does this memory last?');
  assert.ok(futureQuizzes[2].options.every(o => !o.response), 'The last question has no answer; the finale lines answer it');
  assert.ok(future.steps.some(s => s.kind === 'play' && s.game === 'future-home'));
  const finaleChapter = storyChapters.at(-1).objectives;
  assert.deepEqual(finaleChapter.map(o => o.type), ['trail', 'echo'], 'A final trail home, then Echo VI');
  assert.ok(Math.hypot(future.site.x - 800, future.site.y - 512) < 200, 'Echo VI waits beside Sunmeadow Stable');
  for (const gift of future.gifts) assert.ok(itemIds.has(gift), gift);
  assert.ok(decorations.some(d => d.id === 'echo-lantern' && future.gifts.includes(d.unlockItem)), 'Birthday stable decoration');
  assert.ok(decorations.some(d => d.id === 'cat-bed' && future.gifts.includes(d.unlockItem)), 'Cat decoration');
  assert.ok(future.gifts.includes('echo-tack'), 'Birthday outfit and teal & oak tack');
  assert.ok(accessories.some(a => a.id === catCompletion.reward && a.unlockItem === catCompletion.reward), 'All-cats reward is an accessory');
  const home = echoGames.futureHome;
  assert.deepEqual(home.spots.filter(s => s.animal).map(s => s.id).sort(), ['bolt', 'maco', 'maks', 'miki', 'nomi', 'viski'], 'All six animals live in the future apartment');
  assert.ok(home.enough < home.spots.length && home.spots.find(s => s.id === 'maks').flee, 'Maks still runs away; exploring enough offers the way on');
  for (const spot of home.spots) assert.ok(spot.x - spot.width / 2 >= 0 && spot.x + spot.width / 2 <= 960 && spot.y - spot.height / 2 >= 0 && spot.y + spot.height / 2 <= 540, spot.id);
  const futureText = JSON.stringify({ future, home, birthdayCard, birthdayReveal, birthdayGifts });
  assert.ok(!/minecraft|fortnite|warframe|brawl|pok[eé]mon|mcdonald/i.test(futureText), 'Shared games and McDonald’s are only hinted at');
  assert.equal((JSON.stringify(echoGames).match(/Baber/g) ?? []).length, 1, 'Baber once, in the future apartment');
  assert.ok(birthdayCard.heading.includes(giftConfig.nickname) && giftConfig.nickname === 'Banca' && giftConfig.alternateNickname === 'Baber', 'Banca once, on the card');
  assert.ok(birthdayCard.message.length > 0 && birthdayCard.signature.includes(giftConfig.developerName), 'The card always has a message and a signature');
  assert.equal(giftConfig.recipientName, 'Hana');

  // Races: data-driven tracks with readable, jumpable spacing.
  assert.deepEqual(raceTracks.map(t => t.id), ['meadow-sprint', 'forest-run', 'moonlight-derby']);
  assert.equal(raceTracks[0].unlock, null, 'Meadow Sprint is always open');
  for (const track of raceTracks) {
    assert.ok(raceThemes[track.theme] && itemIds.has(track.reward), track.id);
    assert.ok(track.obstacles.length >= 6, track.id);
    track.obstacles.forEach((o, i) => {
      assert.ok(obstacleShapes[o.kind], `${track.id} ${o.kind}`);
      assert.ok(o.at >= 600 && o.at <= track.length - 500, `${track.id} obstacle ${i} inside the track`);
      if (i) assert.ok(o.at - track.obstacles[i - 1].at >= 350, `${track.id} obstacle ${i} leaves room to land`);
    });
    if (track.unlock?.afterTrack) assert.ok(raceTracks.some(t => t.id === track.unlock.afterTrack), track.id);
    if (track.unlock?.afterEcho) assert.ok(echoes.some(e => e.id === track.unlock.afterEcho), track.id);
  }
  assert.ok(new Set(raceTracks.flatMap(t => t.obstacles.map(o => o.kind))).size === Object.keys(obstacleShapes).length, 'Every obstacle kind is used');

  // Fashion: tags, never one exact outfit.
  const starterOutfits = ['meadow', 'berry', 'sky'];
  const starterAccessories = accessories.filter(a => !a.unlockItem).map(a => a.id);
  for (const round of styleParade.rounds) {
    const ways = [...starterOutfits.filter(id => outfitTags[id].includes(round.tag)), ...starterAccessories.filter(id => accessories.find(a => a.id === id).tags.includes(round.tag))];
    assert.ok(ways.length >= 2, `${round.id} can be passed in more than one way`);
  }
  assert.ok(itemIds.has(styleParade.reward) && accessories.some(a => a.unlockItem === styleParade.reward), 'Parade reward unlocks an accessory');
  assert.deepEqual(accessories.map(a => a.name).filter(n => n !== 'No accessory').sort(), ['Cat sweater', 'Flower crown', 'Riding helmet', 'Straw hat', 'Teal scarf']);

  // Horses and cats.
  assert.ok(bolt.breed === 'black Flat-Coated Retriever' && storyObjectives.some(o => o.type === 'pet' && o.description.includes('Flat-Coated Retriever')), 'Bolt is explicitly a black Flat-Coated Retriever');
  for (const cat of villageCats) assert.ok(cat.note, cat.id);
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
    race: { checkpointIndex: null, elapsedMs: 0, resultText: '' }, dialogue: null, accessoryId: 'none', raceBest: {}, animals: [],
  };
  const parse = data => parseGameSave(JSON.stringify(data));
  assert.deepEqual(parse(base), base);
  assert.equal(parse({ ...base, mounted: true }), null, 'No riding before choosing a horse');
  for (const horseName of ['', 'x'.repeat(17), '<b>', 42]) assert.equal(parse({ ...base, horseName }), null, JSON.stringify(horseName));
  assert.equal(parse({ ...base, horseName: 'Sky' }).horseName, 'Sky');
  const legacy = { ...base }; for (const key of ['storyTarget', 'activityProgress', 'dialogueTarget', 'restoredEchoes', 'echoProgress', 'horseName', 'accessoryId', 'raceBest', 'animals']) delete legacy[key];
  const migrated = parse({ ...legacy, horseId: 'gray-mustang', storyIndex: 4 });
  assert.deepEqual([migrated.horseName, migrated.storyIndex, migrated.restoredEchoes, migrated.echoProgress], ['Silver', 4, [], null]);
  const echoIndex = storyObjectives.findIndex(o => o.type === 'echo' && o.target === 'break');
  assert.equal(parse({ ...base, horseName: 'Sky', storyIndex: 2, storyTarget: storyObjectives[echoIndex].id, restoredEchoes: ['spark'] }).storyIndex, echoIndex, 'Objective ID wins over index');
  const legacyLate = parse({ ...legacy, horseName: 'Sky', storyIndex: echoIndex + 1 });
  assert.deepEqual(legacyLate.restoredEchoes, ['spark', 'break'], 'Saves without explicit Echo state infer it from the story position');

  // Saves from the previous batch (three Echoes, then the oak or free roam) resume at the new chapters.
  const newChapter = storyObjectives.findIndex(o => o.chapter === 'Not in the Records');
  assert.equal(newChapter, storyObjectives.findIndex(o => o.type === 'echo' && o.target === 'half-bed') + 1);
  const three = ['spark', 'break', 'half-bed'];
  for (const storyTarget of ['complete', 'More Echoes Are Stirring:oak-stirring']) {
    const resumed = parse({ ...base, horseName: 'Sky', storyIndex: 32, storyTarget, restoredEchoes: three, dialogue: 'story-inspect', dialogueTarget: 'More Echoes Are Stirring:oak-stirring' });
    assert.deepEqual([resumed.storyIndex, resumed.dialogue, resumed.restoredEchoes], [newChapter, null, three], storyTarget);
  }
  assert.equal(parse({ ...base, horseName: 'Sky', mounted: true, race: { checkpointIndex: 1, elapsedMs: 4000, resultText: '' } }).race.checkpointIndex, null, 'A legacy overworld race loads as not racing');
  assert.deepEqual(parse({ ...base, raceBest: { 'meadow-sprint': 21400 } }).raceBest, { 'meadow-sprint': 21400 });
  for (const raceBest of [{ nope: 1 }, { 'meadow-sprint': -1 }, { 'forest-run': 'fast' }, []]) assert.equal(parse({ ...base, raceBest }), null, JSON.stringify(raceBest));
  assert.equal(parse({ ...base, accessoryId: 'teal-scarf' }).accessoryId, 'teal-scarf');
  assert.equal(parse({ ...base, accessoryId: 'top-hat' }), null);
  assert.deepEqual(parse({ ...base, animals: ['nomi', 'bolt'] }).animals, ['nomi', 'bolt']);
  for (const animals of [['nomi', 'nomi'], ['dragon'], 'nomi']) assert.equal(parse({ ...base, animals }), null, JSON.stringify(animals));
  assert.deepEqual(parse({ ...base, echoProgress: { id: 'cuisine', steps: ['fragments', 'holiday'] }, restoredEchoes: three }).echoProgress, { id: 'cuisine', steps: ['fragments', 'holiday'] }, 'Solved minigame steps persist');
  assert.equal(parse({ ...base, storyIndex: 3, storyTarget: 'Removed chapter:gone' }).storyIndex, 3);
  for (const index of [null, -1, 1.5, storyObjectives.length + 1]) assert.equal(parse({ ...base, storyIndex: index, storyTarget: undefined }), null);

  for (const type of ['trail', 'care', 'fashion']) {
    const index = storyObjectives.findIndex(o => o.type === type);
    const ids = activityIds(storyObjectives[index]);
    const restoredEchoes = storyObjectives.slice(0, index).filter(o => o.type === 'echo').map(o => o.target);
    const current = { ...base, horseName: 'Sky', storyIndex: index, storyTarget: storyObjectives[index].id, restoredEchoes };
    assert.deepEqual(parse({ ...current, activityProgress: [ids[0]] }).activityProgress, [ids[0]]);
    for (const progress of [null, 42, ['unknown'], [ids[0], ids[0]], ids]) assert.equal(parse({ ...current, activityProgress: progress }), null, `${type} ${JSON.stringify(progress)}`);
    if (type !== 'care') assert.equal(parse({ ...current, activityProgress: [ids[1]] }), null, `${type} steps are ordered`);
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

  const done = parse({ ...base, horseName: 'Sky', storyIndex: storyObjectives.length, storyTarget: 'complete', restoredEchoes: echoes.map(e => e.id), inventory: { 'echo-tack': 1, 'echo-spare-key': 1, 'cat-bed': 1, 'cat-sweater': 1 } });
  assert.equal(done.storyIndex, storyObjectives.length, 'A finished birthday save stays finished');
  assert.deepEqual(done.restoredEchoes, echoes.map(e => e.id));
  // Saves that finished the previous batch (five Echoes, free roam) resume after Echo V, not at the end.
  const five = echoes.slice(0, 5).map(e => e.id);
  const previousEnd = parse({ ...base, horseName: 'Sky', storyIndex: 44, storyTarget: 'complete', restoredEchoes: five });
  assert.equal(previousEnd.storyIndex, storyObjectives.findIndex(o => o.type === 'echo' && o.target === 'first-winter') + 1);
  assert.deepEqual(parse({ ...base, horseName: 'Sky', echoProgress: { id: 'future', steps: ['blur', 'home'] }, restoredEchoes: five }).echoProgress, { id: 'future', steps: ['blur', 'home'] });
  console.log(`PASS: ${storyChapters.length} chapters, ${storyObjectives.length} objectives, ${echoes.length} Echoes with the birthday finale, ${raceTracks.length} race tracks, parade, horses, animals, save validation and migration.`);
} finally { await rm(compiled, { recursive: true, force: true }); }
