# Quest design

Keep quests short, legible, and active: riding and discovery lead, dialogue gives context. The first arc introduces the stable, villagers, cosmetics, and race before revealing Echoes gradually. 

**Target Structure:**
The full campaign architecture will span approximately 10–14 main quests, targeting around 60–90 minutes of total playtime. Do not pad playtime with dialogue. The focus is on horse riding, grooming, customization, races, quizzes, puzzles, exploration, cats, decoration, and the personalized Echoes.

**Objective Types:**
Reusable objective shapes include talking to an NPC, reaching a location, collecting or delivering an item, interacting, riding to a place, completing a race, equipping an item, finding a hidden object, grooming or feeding a horse, inspecting a cat, and **quizzes/reconstructions**.

**Echo System & Quizzes:**
The main story revolves around mysterious Echoes—magical memories connected to Evervale that gradually become suspiciously personal. 
Each major Echo supports:
- A quest trigger & transition into the memory presentation.
- A short narrative setup.
- An interactive quiz/puzzle stage (e.g., matching or multiple choice).
- Correct/incorrect response handling.
- Funny, non-punishing wrong-answer feedback (e.g., "The Echo seems unconvinced", "That is one version of events", "Suspicious answer"). The player can retry immediately.
- Memory completion, reward, progression persistence, and return to normal gameplay.
The quizzes should feel affectionate, not like exams. Use intentionally silly options occasionally.

**Campaign outline (quests 1–10 playable, 11–14 planned):**
1. Welcome to Sunmeadow: keeper, stable nameplate, Nomi.
2. Meet Your Horse: three horse cards at the paddock (Quarter Horse first, name pre-filled "Sky", renameable), mount, ride, brush/water/treat.
3. Make It Yours: outfit, one stable decoration, teal flower pot.
4. The First Ride · 5. Village Day · 6. First Race.
7–9. Echo I–III: a short light trail to a distinct site (dusk stones SE, string telephone by the pond, starlit knoll N), then the Echo.
10. More Echoes Are Stirring: the old oak hums; free roam with "Echoes restored 3 of 6".
11–13. Echo IV–VI. 14. Birthday finale, reserved for Echo VI; the oak is its location and `birthdayFinale` its text.

**Echo framework:**
Content lives in `src/data/echoes.ts` (intro, `quiz`/`match` steps, completion, Hana's reflection, keepsake reward). `EchoScene` runs one Echo over the paused world through `EchoPanel`; `src/art/EchoStages.ts` draws one stage per setting and plays step cues; `src/art/EchoSites.ts` owns world props and local lighting. Saves hold explicit `restoredEchoes` and `echoProgress` (solved steps), so leaving or reloading mid-Echo resumes at the next step. To add an Echo: define it, add a setting stage and site look, add a light trail and `echo` objective to `story.ts`, and give its keepsake a decoration.

**Rewards:**
Quest rewards should encourage customization and play: clothing, tack, currency, decorations, collectibles, or access. Race routes need readable checkpoints, forgiving collisions, and optional best times. Keep stats from making cosmetic horse choice feel like a penalty.
