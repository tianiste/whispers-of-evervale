# Data and save contracts

Current persistence is defined in `src/data/save.ts` and stored in `localStorage` as version 1. It saves only systems in the current slice: stable content IDs, rider/horse selection and positions, mount state, quest progress, inventory, outfit, stable decorations, race checkpoint/time/result, and the current dialogue ID. Dialogue text, including the personalized finale, stays in editable content files and is resolved from its saved ID.

Content definitions will eventually cover clothing, horses, tack, quests/objectives, NPCs/dialogue, shops, races, decorations, and collectibles. Use stable IDs and typed references so saves do not depend on display names.

Version 1 has grown only by validated additive fields: `storyTarget`, `activityProgress`, `dialogueTarget`, `horseName`, `restoredEchoes` and `echoProgress`. Missing fields in older saves take safe defaults.

Malformed or unsupported saves are deleted and start a new game through the character creator. Version 1 has no migration path; bump the version when its shape changes. Validate stored JSON against typed IDs, world bounds, and current objective/race ranges. Storage access failures leave the game playable without crashing. Add future state only when its systems are implemented.

Birthday text belongs in editable gift configuration (recipient name, optional nickname, final message, developer name), not shared game state unless progress requires an unlock flag.
