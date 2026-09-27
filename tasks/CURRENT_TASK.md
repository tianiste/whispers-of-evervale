# T006 — Character Creator: Small Playable Option Set

agent_tier: standard
context_budget: small

## Goal

Let the player choose a simple rider appearance before entering the clearing.

## Context

The menu currently enters the clearing directly. The rider is a temporary circle; the birthday slice needs a small personal choice before expanding horse selection or customization.

## Acceptance Criteria

- Enter from the main menu opens a character creator before the clearing.
- Show three distinct, typed rider appearance options with a live preview.
- The player can change the selected option and confirm to enter the clearing.
- The selected appearance is visible on the rider in the clearing and remains consistent while mounting and dismounting.
- The creator and preview use existing Phaser primitives; no new dependency or asset pipeline.

## Relevant Files

- `src/main.ts`
- `src/scenes/MainMenuScene.ts`
- `src/scenes/WorldScene.ts`
- `src/data/` for the small typed option set

## Allowed Changes

- Add the minimum scene, typed option data, and runtime handoff needed for this flow.
- Reuse existing keyboard input and placeholder rendering patterns.

## Do Not Implement

- Horse selection, saved appearance, inventory, expanded customization, or production art.

## Verification

- `npm run build`
- Launch in Chromium and verify opening the creator, changing and previewing all options, confirming, and seeing the chosen appearance in the clearing both mounted and dismounted.
