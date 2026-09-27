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
- The typed “A First Ride” and “A Familiar Echo” quests track ordered progress in the HUD. Echo leads to Hana’s editable finale note signed by Tian and grants one horse apple. Quest and finale dialogue state are saved locally.
- Collecting the quest wildflower adds a typed item to inventory; first-ride and Echo completion each grant one horse apple. Inventory counts are saved locally.
- O opens a wardrobe with outfit/rider categories, visual previews and equipped states. Existing outfit and rider choices remain saved locally.
- The mounted rider can start the typed Clearing Canter at its marked gate, pass three numbered checkpoints in order, and earn one horse apple on completion. Active checkpoint, elapsed time, result, and reward are saved locally.
- Three typed stable decoration slots cycle through flower box, lantern, and wreath options in Horse & stable. Selections are saved locally and restored on continue.
- The clearing has three softly pulsing fireflies, a subtle horse breathing idle cue, and a quiet looping countryside ambience bed that stops when the scene shuts down.
- A marked dirt lane connects the stable clearing to a compact village with two placeholder buildings, two typed villagers using the dialogue box, and two fixed-position cat cameos.
- Completing “A First Ride” unlocks the short “A Familiar Echo” quest: the Stable Keeper and Trail Guide reveal clues in order, leading to an old oak and Hana’s editable birthday note signed by Tian. It grants one horse apple, then returns to free roam after the note closes.
- Version 1 local saves restore the current slice state, including selections, player/horse positions and mount state, quest progress, inventory, outfit, decorations, active/completed race state, and open dialogue. Invalid or unsupported data is discarded and starts a new game through the character creator.
- The fixed 960×540 canvas scales with Phaser FIT. A native HTML interface provides a compact objective and contextual interaction prompt, satchel (I), wardrobe (O), horse/stable (H), journal (J), and pause/audio (Esc). Dialogs trap focus and stop movement; buttons have shared hover, press and focus states. Dialogue uses the same interface. Quest/item/equip feedback is transient. The bakery counter has an explicit no-goods state; there is no economy or tack catalog.
- Product, art, world, quest, customization, personalization, data, and agent contracts are documented.

## Key paths

- `src/main.ts`, `src/config/gameConfig.ts`, `src/scenes/`
- `public/assets/`
- `tasks/BACKLOG.md`, `tasks/CURRENT_TASK.md`
- `handoffs/latest.md`

## Contracts

Keep data definitions, serializable state, runtime logic, rendering, and UI distinct. Add only structures required by the current task. Personal finale text stays editable/configurable and is resolved from dialogue IDs rather than copied into save data. Do not expand beyond the birthday slice until its core works.

## Known gaps

Production world art, expanded character and horse customization, larger dialogue/quest content, clothing beyond the three placeholder outfits, a full stable builder, and polish remain unimplemented. The current world, obstacles, and marker are temporary test scaffolding.
