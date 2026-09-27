# Current state

## Milestone

M0 — first playable loop. October 1 is the target for a polished, small birthday vertical slice; prioritize working loops over world size.

## Stack and playable state

Phaser 3 + strict TypeScript + Vite + npm, static desktop browser target. `npm run dev` starts Vite. Runtime initializes Phaser, enters `BootScene`, then `MainMenuScene`; Enter opens `CharacterCreatorScene`, where the player selects a rider appearance before entering `WorldScene` at 960×540.

## Implemented

- Minimal game configuration and scene startup/transition.
- `BootScene.preload()` is the shared asset-loading entry point.
- Vite static asset root exists at `public/assets/`.
- Strict TS compiler options and build/typecheck scripts.
- `WorldScene` has a temporary 1800×1100 gridded test area, a keyboard-controlled marker, normalized WASD/arrow movement at 220 px/s, four circular solid obstacles, Arcade Physics world-edge bounds, and a camera that follows within world bounds.
- The clearing includes a stationary brown Quarter Horse placeholder. Its typed definition is in `src/data/horses.ts`; `HorseEntity` draws it with Phaser primitives.
- The player can mount the first horse with E within interaction range, ride with WASD/arrows, and dismount into a nearby clear spot. Horse and player collide with clearing obstacles and world bounds; the camera follows the mounted rider.
- The character creator offers three typed placeholder rider colors and three typed first-horse options with live previews. Confirmed rider and horse IDs are passed into the clearing; the chosen rider stays consistent through mounting/dismounting, and the selected horse definition drives its appearance.
- A nearby placeholder stable keeper opens one typed greeting in a reusable dialogue box. While the box is open, player and horse movement pause; Enter or Space closes it.
- The typed “A First Ride” quest tracks talk, reach, collect, and horse interaction objectives in order, with a HUD tracker and completion message. Progress lasts only for the current scene session.
- Collecting the quest wildflower adds a typed item to the runtime inventory; completing the quest grants one horse apple. A compact HUD line shows item counts. Inventory is not saved.
- Product, art, world, quest, customization, personalization, data, and agent contracts are documented.

## Key paths

- `src/main.ts`, `src/config/gameConfig.ts`, `src/scenes/`
- `public/assets/`
- `tasks/BACKLOG.md`, `tasks/CURRENT_TASK.md`
- `handoffs/latest.md`

## Contracts

Keep data definitions, serializable state, runtime logic, rendering, and UI distinct. Add only structures required by the current task. Local browser persistence is planned, not implemented. Personal finale text stays editable/configurable. Do not expand beyond the birthday slice until its core works.

## Known gaps

Production world art, character and horse selection, dialogue/quests, inventory/clothing, racing, decoration, Echo sequence, birthday finale, saving/loading, and polish remain unimplemented. The current world, obstacles, and marker are temporary test scaffolding.
