# Handoff

## Task completed

T012 — One Forgiving Checkpoint Race.

## Implementation and verification

- Added the typed Clearing Canter route in `src/data/race.ts`, with a start gate and three numbered checkpoints. R starts it while mounted at the gate; the HUD shows ordered progress and elapsed time.
- Completing the route shows the finish time and adds one horse apple through the existing inventory flow. Dismounting cancels an active race; race state is runtime-only.
- `npm run build` and `git diff --check` passed. Chromium verified checkpoint progress, finish result, and one horse apple reward. Vite printed its existing large-bundle advisory.

## Contracts to preserve

- Keep the birthday vertical slice small and typed content separate from runtime behavior.
- Keep outfit choice runtime-only and preserve the rider appearance through mount transitions.
- Keep race route content typed and separate from runtime behavior; preserve the first-ride quest flow.

## Next task

- T013 — A Few Stable Decoration Slots with Saved Selections.

## Current playable state

Press Enter at the menu, choose a rider with left/right and a horse with up/down, then confirm with Enter. In the clearing, move with WASD/arrows, interact with E, cycle outfits with O, and start the Clearing Canter with R while mounted at its marked gate. Follow “A First Ride” in the HUD; dialogue closes with Enter or Space. Inventory, outfit, and race state reset with the scene.
