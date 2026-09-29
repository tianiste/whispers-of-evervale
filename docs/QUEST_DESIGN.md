# Quest design

Keep quests short, legible, and active: riding and discovery lead, dialogue gives context. The first arc introduces the stable, villagers, cosmetics, and race before revealing Echoes gradually. 

**Target Structure:**
The full campaign architecture will span approximately 10–14 main quests, targeting around 60–90 minutes of total playtime. Do not pad playtime with dialogue. The focus is on horse riding, grooming, customization, races, quizzes, puzzles, exploration, cats, decoration, and the personalized Echoes.

**Objective Types:**
Reusable objective shapes: talk, ride, inspect, trail (ordered mounted waymarks), mount, choose-horse, care (brush/water/treat), groom, equip, decorate (any slot, or a specific decoration), shop, cat, pet (Bolt), race (a track ID), fashion (ordered parade rounds) and echo.

**Echo System & Quizzes:**
The main story revolves around mysterious Echoes—magical memories connected to Evervale that gradually become suspiciously personal. 
Each major Echo supports:
- A quest trigger & transition into the memory presentation.
- A short narrative setup.
- Interactive steps: quiz, match, reconstruction puzzle or a canvas minigame.
- Correct/incorrect response handling.
- Funny, non-punishing wrong-answer feedback (e.g., "The Echo seems unconvinced", "That is one version of events", "Suspicious answer"). The player can retry immediately.
- Memory completion, reward, progression persistence, and return to normal gameplay.
The quizzes should feel affectionate, not like exams. Use intentionally silly options occasionally. Minigames never fail; misses get a joke and a retry.

**Campaign outline (14 quests, all playable):**
1. Welcome to Sunmeadow: keeper, stable nameplate, Nomi.
2. Meet Your Horse: three horse cards at the paddock (Quarter Horse first, name pre-filled "Sky", renameable), mount, ride, then care. Brush opens the grooming minigame, then water and a treat.
3. Make It Yours: outfit, one stable decoration, teal flower pot.
4. The First Ride · 5. Village Day · 6. First Race (talk to the Race Steward, Meadow Sprint).
7–9. Echo I–III: a short hoofprint trail to a distinct site (dusk stones SE, string telephone by the pond, starlit knoll N), then the Echo.
10. Not in the Records: the Village Historian ("These memories aren't in any Evervale records"), then Madame Rosette's Style Parade; reward flower crown.
11. Echo IV — Improvised Cuisine: groom before a longer ride, Forest Run, a foil glint, silver hoofprints east, the Echo, then hang the foil tray in the stable.
12. Echo V — Cards, Snow, and Orehi: a summer snowflake, frosty hoofprints southwest, the Echo.
13. More Echoes Are Stirring: pet Bolt at the pond, then the oak's ring of lights (5 / 6); the sixth light slips away toward the stable.
14. Echo VI — Not Yet: a teal light trail from the oak home, then Echo VI beside Sunmeadow Stable (its site stays hidden until this chapter). Prelude, reconstruction, the future-apartment look-around, three open questions, the held final lines, then the birthday finale and free roam with Sunmeadow decorated.

**Echo framework:**
Content lives in `src/data/echoes.ts` (intro, steps, completion, Hana's reflection, keepsake reward). Step kinds: `quiz` (with `open`, every option advances and options without a response go straight on), `match`, `reconstruct` (labelled wedge fragments dragged into a disc) and `play` (a minigame ID). An Echo may add a `memoryDate` under its title, a `prelude` held on the dark canvas, extra `gifts`, and `finale`, which holds its completion lines on the canvas and then plays the birthday reveal from `src/data/birthdayGift.ts` instead of the usual return panel. Canvas steps carry `intro`, `solved`, an optional `backdrop` cue that sets the scene first and a `cue` played when solved. `EchoScene` orchestrates: the panel shows the intro, then steps aside (`GameUI.dismiss`) while the game from `src/minigames/index.ts` runs; Escape steps out. Each game implements the `Minigame` contract in `src/minigames/Minigame.ts` (draw into `createLayer`, report `done`, route timers and listeners through `GameScope` so nothing outlives it, and optionally ask the stage for a `cue` or read the player's `horseName`) and reads its text from `src/data/echoGames.ts`. `src/art/EchoStages.ts` draws one stage per setting; `src/art/EchoSites.ts` owns world props, local lighting and the oak's six lights. Saves hold explicit `restoredEchoes` and `echoProgress` (solved steps, including each minigame), so leaving or reloading mid-Echo resumes at the next step. To add an Echo: define it, add a setting stage and site look, add a trail and `echo` objective to `story.ts`, and give its keepsake a decoration. To add a minigame: implement `Minigame`, register it under a new `MinigameId`, and name its interactive objects for the browser test.

**Races:**
`src/data/race.ts` holds tracks (length, theme, obstacle list, first-finish reward, unlock rule), obstacle shapes and theme palettes; `src/art/RaceArt.ts` draws obstacles and parallax per theme; `RaceScene` runs any track: title, 3-2-1-GO, auto-run, jump (Space/W/↑/click, with a short input buffer), bumps that slow the horse and add one second, progress, timer, finish, results with best time and reward, retry or return. Add or retheme a track in data only. The Race Steward at the gate opens the track list through normal interaction (R is a shortcut there).

**Other systems:**
Grooming (`GroomScene`) is about ten seconds of scrubbing six mud patches; Space auto-brushes. Echo trails (`src/art/EchoTrail.ts`) walk glowing hoofprints from the rider to the next waymark with fog and sparks there; the horse hops at each waymark. The Style Parade checks tags on the equipped outfit and accessory, never item IDs. Stable decoration is a slot picker (window, door, sign).

**Rewards:**
Quest rewards should encourage customization and play: clothing, tack, currency, decorations, collectibles, or access. Races give their reward on the first finish and a Horse Apple after; best times persist. Keep stats from making cosmetic horse choice feel like a penalty.
