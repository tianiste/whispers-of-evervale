# Handoff

## Task completed

T016 — Echo Completion Reward and Post-Finale Free Roam.

## Implementation and verification

- Echo completion now grants one horse apple through the typed quest reward. The finale dialogue still pauses play until closed, then free roam resumes.
- `npm run build` and `git diff --check` passed. Chromium verified one completion reward, resumed movement, no duplicate reward on revisiting the oak or talking again, and unchanged first-ride/race rewards. Build retains its existing large-bundle advisory.

## Current playable state

Complete “A First Ride” to unlock “A Familiar Echo”; talk to the Stable Keeper, then the Trail Guide, and follow the HUD to the old oak. The note grants one horse apple; closing it returns control. Inventory, quest, outfit, and race state reset with the scene.

## Current blocker — T017

Versioned local saves need an explicit persistence contract. Decide which runtime state should survive restart (quest progress, inventory, outfits, decorations, race state, and character/horse selection) and the recovery behavior for invalid or older save data before implementation.
