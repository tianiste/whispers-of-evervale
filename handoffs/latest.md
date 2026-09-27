# Handoff

## Task completed

T006 — Character Creator: Small Playable Option Set.

## Implementation

- Enter from the main menu opens `CharacterCreatorScene`.
- Arrow keys cycle three typed placeholder appearances (Cream, Chestnut, Midnight) with a live Phaser circle preview; Enter confirms.
- The chosen appearance ID is handed to `WorldScene`, which uses its color for the player circle. Since the same circle remains the mounted rider, appearance stays consistent through mounting and dismounting.

## Verification

- `npm run build` passed. Vite printed its existing large-bundle advisory.
- Chromium verified changing through the appearance options, confirming into the clearing, and seeing Chestnut before mounting, while mounted, and after dismounting.
- `git diff --check` passed.

## Known issues and blocker

- The horse, world, obstacles, and rider marker are temporary placeholders.
- No active blocker is recorded.

## Relevant next files

- `src/scenes/CharacterCreatorScene.ts`
- `src/scenes/WorldScene.ts`
- `src/data/riderAppearances.ts`

## Contracts to preserve

- Keep the birthday vertical slice small; separate typed content data from runtime behavior.
- Keep appearance consistent while mounting and dismounting; use existing Phaser primitives.

## Next task

- T006 — Character Creator: Small Playable Option Set (current task).

## Current playable state

Press Enter at the menu, choose a rider appearance with the arrows, and confirm with Enter. Move with WASD or arrows; press E near the brown Quarter Horse to mount, then E again to dismount. The world, obstacles, horse, and rider are still temporary placeholders.
