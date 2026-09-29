# Current state

## Milestone and runtime

Whispers of Evervale is a desktop birthday adventure built with Phaser 3.90, strict TypeScript and Vite. Boot generates cat and Echo character textures, then leads through MainMenu and a creator that only creates Hana (one of three looks) into a 960×540 FIT canvas. The world is the original 1800×1100 Sunmeadow map. An earlier 64000×48000 countryside expansion was never committed and is not in the repository; the user chose to keep the current map until the personalized campaign and minigames are complete.

## Campaign

`src/data/story.ts` holds ten chapters and 32 sequential objectives:

1. Welcome to Sunmeadow: Stable Keeper, stable nameplate, Nomi.
2. Meet Your Horse: three horse cards at the paddock south of the stable. The brown Quarter Horse is first with "Sky" pre-filled; the name can be changed (max 16 characters). Then mount, ride out and back, and horse care (H → Your horse: brush, water, treat).
3. Make It Yours: outfit and one stable decoration; rewards the teal flower pot.
4. The First Ride, 5. Village Day (baker gift, Miki, race notice), 6. First Race (Clearing Canter, three gates, no time limit).
7–9. Echo I–III: each begins with a short mounted trail of coloured lights (violet, golden, blue) to a distinct site with its own props and local screen lighting: dusk stones in the southeast, a string telephone north of the pond, a starlit knoll in the north.
10. More Echoes Are Stirring: the old oak hums; the story then returns to free roam, with the HUD and journal showing "Echoes restored 3 of 6".

The birthday finale is not reachable. `birthdayFinale` (in `birthdayGift.ts`), the oak and the `echo-tack`-gated birthday outfit, ribbon and Echo lantern are reserved for Echo VI.

## Echo framework

`src/data/echoes.ts` owns Echo content: setting, site, two or three intro lines, steps (`quiz` with one correct option and per-option funny responses, or `match` pairs with miss lines), completion lines, Hana's reflection and a keepsake reward. `plannedEchoes` lists IV–VI so the journal counts six. `EchoScene` launches over the paused World after a flash and fade. It shows the setup, runs the steps through `src/ui/EchoPanel.ts` (a low dialog over a transparent backdrop), plays stage cues from `src/art/EchoStages.ts`, then shows completion, keepsake and restored count, and returns. Wrong answers keep the question open, strike through the option and show feedback; nothing resets. Escape leaves early; solved steps persist and the Echo resumes at the next step. Back in the world, Hana's reflection plays, the site orb dims, and the keepsake unlocks a matching stable decoration (glow sticks, phone charm, Banjole seashell).

Stages are drawn procedurally with generated pixel figures for Hana, Tian, Maj, Tilen and friends (`src/art/EchoFigures.ts`), with heights following the character references:
- Club: beams, a bass-pulse camera bump (off under reduced motion), a quiet synthesized kick, and a cigarette-ember cue ending on Tian's left cheek.
- Split office/warehouse: halves light up as pairs match, then phones connect and a shared thought bubble of the sea appears.
- Camper van: generic phone-game flashes, a spilled glass, water spreading over half the bed, and both squeezed onto the dry side.

## Cats and world

Five real cats replace the generic ones. Positions are in `src/data/village.ts`; behaviors in `src/entities/CatEntity.ts`:
- Nomi follows you around the stable and relocates when pestered.
- Miki is loud.
- Viski turns around at random.
- Maks runs off twice before allowing a pat.
- Maco reappears in odd spots.

Cat textures are generated under `cat-<id>`; a PNG loaded under the same key replaces them. The two unchosen horses stay in the paddock as scenery.

## Controls, persistence and validation

WASD/arrows move; E interacts or mounts/dismounts; R at the mounted race gate opens its briefing; I/O/H/J/Escape open windows. Save version 1 remains, with validated additive fields: `storyTarget` (wins over the index), `activityProgress` (ordered for trails), `dialogueTarget`, `horseName` (null until chosen; legacy saves use the default name), `restoredEchoes` and `echoProgress`. On load, restored Echoes are never replayed and passed Echo objectives are recorded.

`npm run typecheck`, `npm run build` and `npm test` pass. `scripts/verify-ui.mjs` passed in headless Chrome against the dev server (60 FPS, no browser errors). It covers a fresh save through Echo III with accelerated travel and real key/click input: horse choice and renaming, wrong-answer retries, the match puzzle, leave/reload/resume mid-Echo, reflections after reload, rewards, cats, race, free roam, and a keyboard-ridden race lap. Run it with `CHROMIUM` set to a Chrome binary. The Vite large-bundle advisory remains; no lint script exists. The user played the build and reported it working. Casual playtime has not been measured.
