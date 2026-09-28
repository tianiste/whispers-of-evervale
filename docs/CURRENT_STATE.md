# Current state

## Milestone and runtime

Whispers of Evervale is a desktop birthday adventure built with Phaser 3.90, strict TypeScript and Vite. Boot leads through MainMenu and a rider/first-horse creator into a 960×540 FIT canvas. The user explicitly authorized expanding playable space and activities to meet the original 45–75 minute request; the previous compact-world constraint no longer applies to this task. No backlog advancement is authorized.

Sunmeadow's original 1800×1100 home area remains at its original coordinates inside a 64000×48000 countryside. Eleven authored routes connect orchards, wildflower meadows, willow waterways, fern hollows, picnic lookouts, woodland, ridges and the final Echo oak. Main travel plus the race amounts to roughly 760,700 pixels, or 38.4 minutes at full riding speed before interactions/navigation. This is a design budget, not a measured casual playtime claim. Real-time keyboard playthrough validation is in progress.

## Main adventure and activities

`src/data/story.ts` owns ten chapters and 94 sequential sub-objectives; `src/data/journeys.ts` owns the shared route geometry and landscape themes. The beginning introduces the stable, horse selection, riding, wardrobe, decorations, horse care and village. 
The Echo mystery is currently being reworked to include three personalized Echo memories (HardBeats, GEN-I, Banjole) along with an interactive quiz/reconstruction UI. The final route leads to the configured birthday message beneath the eastern oak, then free roam.

Trail legs have ordered, generous checkpoints and no timers. Search items can be inspected in any order; patterns show the intended sequence and mistakes only give a hint. All partial activity progress saves. Horse care uses H → Your horse to brush, water and offer a treat while dismounted beside the horse. It costs no inventory items. Short discoveries provide natural stopping places between riding legs; there are no mandatory waits, combat, losing states or required repeated laps.

Meadow and Sky outfits are available initially. The baker gives Berry free, without duplicate gifts. The stable chapter awards a teal flower pot. Clearing Canter awards a Horse Apple and now follows thirty ordered gates through the countryside back to Sunmeadow. It retains briefing, countdown, directional guidance, elapsed time, results, cancellation and repeat play, with no time limit. Three Echo fragments remain keepsakes. The finale unlocks Birthday teal clothing, automatically fits a teal bridle ribbon and unlocks the Echo lantern for stable slots. H → Your horse offers a return to Sunmeadow after the ending. Wardrobe, decorating, cats and racing remain available afterward.

Six cats include three optional countryside encounters. Maple, the brown Quarter Horse, remains a starter choice alongside Mustang and Friesian options. Personal details stay restrained: teal, cats, countryside, a Quarter Horse sketch, one village joke, a hidden initial and the warm finale. `src/data/birthdayGift.ts` retains the user's configured personal message and signature. No currency economy, new horse unlock or general tack collection system was added.

## Presentation and controls

Existing pixel art is reused with bounded scenery streaming: nine nearby 768px chunks, authored paths, flower patches, tree groves, orchard fruit, paddock rails, ridge stones, pools, bridges and route signs. The final region gains teal lighting and stronger Echo markers. Four original home collision obstacles remain; extended scenery is decorative. The renderer does not allocate a world-sized texture. Original ambience and quiet feedback tones remain; no new audio dependency or finale music asset was introduced.

WASD/arrows move; E interacts or mounts/dismounts; R at the mounted race gate opens its briefing. I opens the satchel, O the wardrobe, H horse/stable, J the journal, and Escape pause. Native dialogs pause gameplay, trap focus, support Escape and show feedback. Context prompts match interaction priority: current discoveries, close mounting, cats, NPCs. Walking reaches 205px/s and riding 330px/s, retaining acceleration, braking, dust and camera look-ahead.

## Persistence and validation

Save version 1 remains. Additive `storyTarget` (chapter-qualified objective ID), `activityProgress`, and `dialogueTarget` are validated. Stable IDs prevent inserted content or repeated mount targets from reinterpreting saved progress. Original 38-step saves migrate through an explicit lookup; completed gifts remain complete, and open discovery dialogue keeps its original text. An old active three-gate race ends safely rather than resuming at an unrelated gate in the new course.

Build, typecheck, independent content/migration tests and isolated scenery-streaming checks pass. `npm test` runs the content/save checks. `scripts/verify-ui.mjs` checks the story, activities, rewards, windows, race, reloads and free roam; its `--realtime` mode starts a fresh save and drives the story through keyboard travel. Expanded browser validation is in progress. Screenshots live in the system temporary directory. Vite retains its large-bundle advisory; no lint script exists.
