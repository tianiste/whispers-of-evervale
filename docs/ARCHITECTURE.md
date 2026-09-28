# Architecture

## Stack and runtime

Phaser 3, strict TypeScript, Vite, npm; deploy as a static desktop-browser game. `src/main.ts` creates the Phaser game, `src/config/gameConfig.ts` owns engine settings, and `src/scenes/` owns scene lifecycle. `BootScene` is the shared asset-loading entry point and transitions to `MainMenuScene`.

## Boundaries

Keep static typed content in `src/data/`, serializable state/contracts in `src/types/`, runtime behavior in `src/systems/` and `src/entities/`, and interface code in `src/ui/`. Add folders/files when real work needs them; avoid empty scaffolding and giant managers. Phaser scenes orchestrate flow, not every menu by default. HTML/CSS overlays are acceptable with a clear Phaser boundary.

Separate content definitions, save state, runtime logic, rendering, and UI. Prefer small systems with explicit inputs over hidden global state. Browser local storage is the initial save target; introduce versioned save data before persistence ships.

## Asset loading and deployment

Keep source assets in `public/assets/` and reference them via `/assets/...` in Vite. Load shared assets in `BootScene`; scene-specific assets belong to the scene that uses them. Vite's relative base supports static hosting under a path.

## Constraints

Use native Phaser/TypeScript/browser capabilities and installed dependencies first. Add a dependency only for a concrete need. Do not add a backend, account system, React, networking, ECS, or speculative abstractions.
