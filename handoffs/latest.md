# Handoff

## Task completed

T005 — Mount, Ride, and Dismount Controls.

## Implementation

- `WorldScene` mounts the first horse with E inside interaction range; outside the range, E does nothing.
- WASD and arrow keys control the mounted horse. The player marker stays attached, and the camera follows it.
- Both player and horse collide with the clearing obstacles and world bounds.
- E dismounts the player into a nearby clear position. The horse stops and stays in place; the player can mount again.
- `HorseEntity` exposes its existing Phaser graphics object so the scene can attach the Arcade body without changing its placeholder rendering.

## Verification

- `npm run build` passed. Vite printed its existing large-bundle advisory.
- Chromium verified approaching, mounting, mounted movement, dismounting beside the horse, remounting, and movement stopping at an obstacle and the world edge.
- `git diff --check` passed.

## Known issues and blocker

- The horse, world, obstacles, and rider marker are temporary placeholders.
- No active blocker is recorded.

## Relevant next files

- `src/main.ts`
- `src/scenes/MainMenuScene.ts`
- `src/scenes/WorldScene.ts`
- `src/data/` for typed rider appearance options

## Contracts to preserve

- Keep the birthday vertical slice small; separate typed content data from runtime behavior.
- Keep appearance consistent while mounting and dismounting; use existing Phaser primitives.

## Next task

- T006 — Character Creator: Small Playable Option Set (current task).

## Current playable state

Press Enter at the menu, move with WASD or arrows, and press E near the brown Quarter Horse to mount. While mounted, movement controls the horse and the player marker follows above it. Press E to dismount nearby; the horse remains where it was left. The world, obstacles, horse, and marker are still temporary placeholders.
