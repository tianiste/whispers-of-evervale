# Data and save contracts

Current persistence is defined in `src/data/save.ts` and stored in `localStorage` as version 1. It saves only systems in the current slice: stable content IDs, rider/horse selection and positions, mount state, quest progress, inventory, outfit and accessory, stable decorations, race results and best times, animals met, Echo progress, and the current dialogue ID. Dialogue text, including the personalized finale, stays in editable content files and is resolved from its saved ID.

Content definitions cover clothing and accessories (`fashion.ts`), horses, quests/objectives, NPCs/dialogue, races (`race.ts`: tracks, obstacle shapes, themes), decorations, Echoes (`echoes.ts`) and Echo minigame text (`echoGames.ts`). Use stable IDs and typed references so saves do not depend on display names.

Version 1 has grown only by validated additive fields: `storyTarget`, `activityProgress`, `dialogueTarget`, `horseName`, `restoredEchoes`, `echoProgress`, `accessoryId`, `raceBest` and `animals`. Missing fields in older saves take safe defaults. The finale batch added no save fields: its rewards are inventory items, Echo VI is one more `restoredEchoes` ID, and the sound volume lives under its own `localStorage` key (`src/data/settings.ts`). `race.checkpointIndex` belonged to the retired overworld race and is always written as null; a legacy in-progress race loads as not racing.

Story position: `storyTarget` (objective ID, or `complete`) wins over `storyIndex`. Explicit Echo state then wins over both: if any Echo objective before the saved position is not in `restoredEchoes`, the save resumes right after the last restored Echo, so chapters inserted later are played rather than skipped. Saves from before explicit Echo state infer `restoredEchoes` from their position. `activityProgress` is ordered for trails and parade rounds.

Malformed or unsupported saves are deleted and start a new game through the character creator. Version 1 has no migration path; bump the version when its shape changes. Validate stored JSON against typed IDs, world bounds, and current objective/race ranges. Storage access failures leave the game playable without crashing. Add future state only when its systems are implemented.

Birthday text belongs in editable gift configuration (recipient name, optional nickname, final message, developer name), not shared game state unless progress requires an unlock flag.
