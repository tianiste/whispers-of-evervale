# Handoff

## Batch 3A: campaign backbone and Echoes I–III

The previous HEAD did not compile: `src/data/journeys.ts`, `src/art/Countryside.ts` and the matching save/world changes were never committed, and they are not recoverable from git. The user chose to stay on the 1800×1100 map, rebuild the campaign on it, and expand the world only after the personalized campaign and minigames are done.

Implemented:
- Opening quests: Welcome to Sunmeadow, Meet Your Horse (in-world three-card choice, Quarter Horse first, "Sky" pre-filled and renameable) and Make It Yours. The creator only creates Hana.
- A data-driven Echo framework (`echoes.ts` → `EchoScene` + `EchoPanel` + `EchoStages`/`EchoSites`) and Echoes I–III as specified.
- A temporary "More Echoes Are Stirring" beat at the oak, then free roam.
- Five real cats with light behaviors.
- Explicit `restoredEchoes`/`echoProgress` save state.

The oak birthday finale is intentionally unreachable and reserved for Echo VI.

## Next

Echo IV–VI follow immediately. Motifs are in `docs/PERSONALIZATION.md` and `plannedEchoes`; the add-an-Echo recipe is in `docs/QUEST_DESIGN.md`. Each new setting needs an `EchoStages` builder and an `EchoSites` look. `Record<EchoSetting, …>` makes a missing one a type error. Insert the new chapters before "More Echoes Are Stirring", or move that beat later. `storyTarget` keeps saves stable across inserted chapters. Echo VI then hands off to the finale using `birthdayFinale` and the `echo-tack` rewards.

## Known limits

- The world is compact, and casual playtime is unmeasured and well short of 60–90 minutes.
- Some older inspect props (roadside posy, race notice) sit under tree canopies; markers still show them.
- Echo art is procedural and deliberately simple. Generated textures can be replaced by PNGs under the same keys.
- The browser harness needs local port binding (outside the Claude sandbox) and a Chrome binary via `CHROMIUM`.
