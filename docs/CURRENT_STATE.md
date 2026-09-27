# Current state

## Milestone and runtime

M0 — first playable loop. The October 1 birthday vertical slice is implemented, including the user-requested UI/UX and gameplay-feel pass. Post-birthday expansion remains unstarted. The target is a polished small countryside adventure, not more regions or systems.

Phaser 3.90 + strict TypeScript + Vite + npm; static desktop browser target. `npm run dev` starts Vite. Boot loads the shared ambience, then MainMenu leads to CharacterCreator or continues a local save. The creator offers three rider appearances and three first-horse choices. World runs on a 960×540 canvas with Phaser FIT scaling.

## Gameplay and presentation

The 1800×1100 Sunmeadow area still uses placeholder primitives, four circular solid obstacles, a stable, a dirt lane, two village buildings, two villagers, and two cat cameos. The prototype grid has been removed. Three softly pulsing fireflies and countryside ambience remain. Production sprites and world art are still needed.

Walking uses normalized WASD/arrows, a quick acceleration response, and a 205 px/s maximum. Riding has a 330 px/s maximum with a short acceleration ramp, quicker release braking, responsive direction changes, horizontal horse facing, a small rider bob, and brief hoof dust. The horse collision circle is centered on its drawing and stays fixed when facing changes. E mounts a nearby horse or finds a clear dismount spot. A blocked dismount reports that more space is needed. World and obstacle collisions remain Arcade Physics.

Camera follow uses a separate target with modest velocity look-ahead, delta-adjusted easing and a gradual wider riding view. Rider bob does not drive the camera. Mounted rider positions stay inside world bounds, preserving valid saves along the north edge.

## Interface and controls

Normal gameplay shows the tracked objective, a contextual interaction/riding prompt, and a Menu button. Inventory, clothing, decorations, race status and instructions are no longer permanent gameplay panels. No currency is displayed because the slice has no currency system.

One native HTML dialog shell owns all gameplay windows without additional Phaser scenes. It provides dimming, readable cream/forest/teal styling, hover/press/focus states, explicit Tab wrapping, Escape/close/back behavior and reduced-motion CSS. Windows stop movement and suspend race/countdown progress. Losing game focus opens pause when another window is not already open.

- I: satchel with collected item counts and an empty state.
- O: wardrobe with outfit/rider categories, visual choices, current character preview, equipped states and immediate saved changes.
- H: one owned/active horse with breed and preview, a tack empty state, and the three existing stable decoration slots.
- J: ordered quest objectives, completed steps and the most recent race result.
- Esc: pause, menu navigation, controls and a session-level sound-volume slider.
- E: nearby interaction or mount/dismount; prompts follow the same priority as interaction logic.

Dialogue uses the shared modal shell and a focused Continue button, activated with Enter, Space or a click. The bakery dialogue can open its counter, which honestly reports no goods for sale. There is no shop economy or tack catalog. Item collection, quest completion, clue discovery, equip and decoration changes have transient feedback; modal actions also show inline feedback. Mounting, countdown, checkpoints and rewards have quiet synthesized cues through the existing Web Audio sound context.

## Races, quests and saves

At the mounted race gate, R opens Clearing Canter's briefing. Ready starts 3–2–1–GO, then reveals the three ordered checkpoints, elapsed time and next-gate direction/name. Completed gates disappear; future gates are subdued. Finishing stops the horse and opens results with time and the Horse Apple reward. E leaves a race. Race HUD and checkpoints disappear outside active races. Pause freezes elapsed time. Active race progress resumes from saves without granting duplicate rewards.

“A First Ride” leads through the keeper, clearing marker, wildflower and horse interaction. It unlocks “A Familiar Echo,” which leads through keeper/guide clues to the old oak and Hana's editable finale note signed by Tian. Each quest awards one Horse Apple. Free roaming remains available afterward.

Version 1 saves remain unchanged: rider/horse selections, positions, mounted state, outfit, both quest indices, inventory, decoration slots, active/completed race data and dialogue ID persist locally. Invalid/unsupported saves start character creation. Personal text remains content data resolved from IDs.

## Validation and key paths

Build and typecheck are available through npm. There is no package test or lint command. `scripts/verify-ui.mjs` is a dependency-free Chromium integration check: run Vite first, then `node scripts/verify-ui.mjs` with Node 22+ and Chromium on PATH. It uses an isolated profile and test-only entrypoint interception; production exposes no test handle. It exercises menus/focus, customization, dialogue, quests/rewards, riding/collisions, race flows, reloads and desktop layouts. Screenshots go to the system temporary directory. Vite retains its existing large-bundle advisory.

UI shell: `src/ui/GameUI.ts`, `src/style.css`. World orchestration: `src/scenes/WorldScene.ts`. Horse drawing: `src/entities/HorseEntity.ts`. Static content and save validation remain in `src/data/`. `tasks/CURRENT_TASK.md` records this completed pass; no backlog advancement is authorized.
