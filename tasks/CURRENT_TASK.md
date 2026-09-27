# T011 — Equip and Change a Few Rider Outfits

agent_tier: standard
context_budget: medium

## Goal

Let the player switch between a few simple typed outfits and see the selected outfit on the rider.

## Acceptance Criteria

- Define three small typed outfit options as content data.
- The player can cycle/equip outfits during play using a clearly displayed keyboard control.
- The selected outfit is visually distinguishable from the rider’s base appearance.
- Outfit appearance stays consistent while mounted and dismounted.
- Existing rider and horse choices, quest progress, and inventory remain intact.
- Outfit selection is runtime-only; do not add saving or a full clothing catalog.

## Relevant Files

- `src/scenes/WorldScene.ts`
- `src/data/` for typed outfit options
- `src/entities/` for the minimal rider placeholder rendering if needed

## Allowed Changes

- Add the minimum typed outfit data and primitive rendering needed to show the equipped choice.
- Reuse existing keyboard input and HUD patterns.

## Do Not Implement

- Inventory equipment rules, shops, layered asset pipelines, expanded wardrobe, or persistence.

## Verification

- `npm run build`
- Launch in Chromium and cycle all outfits, then verify the chosen outfit remains visible before and after mounting/dismounting.
