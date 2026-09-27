# Handoff

## Task completed

T011 — Equip and Change a Few Rider Outfits.

## Implementation and verification

- Added three typed placeholder outfits in `src/data/outfits.ts`; O cycles them and the HUD displays the current outfit.
- Outfit color is the rider circle's outline, so it follows the existing rider through mounting and dismounting. Rider fill, horse choice, quest, and inventory logic are unchanged.
- `npm run build` and `git diff --check` passed. Chromium verified all three options and Berry persistence while mounted and after dismounting. Vite printed its existing large-bundle advisory.

## Contracts to preserve

- Keep the birthday vertical slice small and typed content separate from runtime behavior.
- Keep outfit choice runtime-only and preserve the rider appearance through mount transitions.

## Next task

- T012 — One forgiving checkpoint race and result/reward.

## Current playable state

Press Enter at the menu, choose a rider with left/right and a horse with up/down, then confirm with Enter. In the clearing, move with WASD/arrows, interact with E, and cycle Meadow, Berry, and Sky outfits with O. Follow “A First Ride” in the HUD; dialogue closes with Enter or Space. Inventory and outfit choice reset with the scene.
