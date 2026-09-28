# Current state

## Milestone and runtime

The October 1 birthday slice runs in Phaser 3.90, strict TypeScript and Vite, targeting desktop browsers. Boot leads through MainMenu and the rider/first-horse creator into a 960×540 FIT canvas. The world remains the original 1800×1100 Sunmeadow area; no regions, dependencies, currency economy or combat were added.

The current direct user request expands the birthday story. Ten chapters and 38 sequential objectives now replace the former seven-step story. This is a cohesive short adventure, **not a validated 45–75 minute experience**. The compact map and 330 px/s riding speed cannot support that duration without substantially more playable content. No mandatory waits or dialogue padding were introduced. A casual-player pacing session remains necessary; automated accelerated progression is not a duration measurement.

## Main adventure and rewards

`src/data/story.ts` owns objective text, coordinates, short discoveries, chapter payoffs and reward IDs. Chapters introduce the stable and selected horse, wardrobe and decoration, the village lane, bakery gift, Clearing Canter, strange hoofprints/plants, three Echo fragments, personal signs, a final scenic ride and the birthday Echo at the old oak.

Objectives use existing riding, inspection, NPC, cat, wardrobe, decoration, counter and race interactions. There is no timer requirement for the story or race. The HUD tracks one objective with a directional arrow for fixed destinations; a ground ring marks the current destination. Echo glow/motes begin during the mystery and grow for the final ride. Small inspectable props and a cat-in-a-riding-hat patch support discoveries visually. The journal retains completed discoveries and chapter progress.

Meadow and Sky outfits are available initially. The bakery gives Berry for free and can be visited before its main objective without duplicate gifts. Making the stable a home awards a teal flower pot for its existing decoration slots. Race completion awards a Horse Apple. Three fragments remain as satchel keepsakes. The finale unlocks a Birthday teal outfit (a tinted existing Sky look), automatically fits a teal bridle ribbon, and makes the Echo lantern available through H → Stable. The configured birthday message and signature in `src/data/birthdayGift.ts` are preserved inside a short reveal. Clothing, decorations, cats and repeat races remain available in free roam.

Three cats are optional interactions outside their story appearances. Maple remains the brown Quarter Horse starter choice alongside the Mustang and Friesian. There is no additional horse/coat unlock or tack collection/equip system; the birthday ribbon is a permanent fitted cosmetic.

## Presentation and controls

Production pixel art, connected countryside paths, stable/village buildings, pond, trees, warm glows and ambient pollen remain. Four circular physics obstacles are unchanged. Scenery remains decorative. Walking reaches 205 px/s; riding reaches 330 px/s with acceleration, release braking, hoof dust and camera look-ahead. Character and horse animation use the existing sprite sheets.

WASD/arrows move; E interacts or mounts/dismounts; R at the mounted race gate opens its briefing. I opens the satchel, O the wardrobe, H horse/stable, J the journal, and Escape the pause menu. Native HTML dialogs pause movement and race/countdown progression, trap keyboard focus, support Escape and expose inline feedback. Close-range horse interaction takes priority over nearby NPCs so parking on a villager does not strand the horse; quest inspections retain priority. Cats within petting range take priority over nearby NPCs, so the cream tabby is usable at its marked position despite the keeper’s overlapping talk range. Prompts reflect that ordering. Story NPC conversations use their authored chapter lines; those lines are restored after reloading an open conversation without adding save fields.

Clearing Canter keeps its three ordered gates, countdown, elapsed time, directional race HUD, completion results, cancellation and repeatable reward. No time limit or losing state was added. The existing ambience and quiet interaction cues remain; there is no separate finale music asset.

## Persistence and validation

Version 1 saves gain one additive validated `storyIndex` field plus new recognized item/outfit/decoration/dialogue IDs. Old unfinished saves begin the expanded story while retaining possessions and position; old completed finales remain complete/free roam and receive the fitted ribbon. Legacy quest fields remain for parsing existing saves. New progress, discoveries, cosmetics, active races and the finale dialog persist. Inspection dialogue resolves from the last completed objective, so reloading does not re-award fragments.

`npm run build`, `npm run typecheck`, and the expanded Chromium verification passed for this content pass; no npm test/lint script exists. The browser pass reported 60 FPS and no browser errors. `scripts/verify-ui.mjs` uses isolated Chromium with a test-only intercepted entrypoint, never a production test handle. Its story traversal uses accelerated travel plus real E/menu input; a separate full race uses keyboard riding. It checks chapter reloads, authored NPC/fragment/finale dialogue restoration, exact cat-marker prompts, early shopping, rewards, migration validation, customization, movement/collisions, race pause/resume/cancel and free roam. The latest integration fixes passed build, typecheck and this expanded browser pass; countdown verification now waits for game state instead of a fixed wall-clock delay. Screenshots are written under the system temporary directory. Vite retains its large-bundle advisory.

The repeated direct birthday-content request is being checked against the existing implementation. The 45–75 minute target remains unresolved: expanding playable space/activities conflicts with the compact-slice scope, and a scope clarification is pending. `tasks/CURRENT_TASK.md` still describes the previously completed UI pass; no backlog advancement is authorized.
