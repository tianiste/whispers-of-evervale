# T014 — Sunmeadow to Village Route, NPCs, and Recurring Cats

agent_tier: standard
context_budget: medium

## Goal

Connect Sunmeadow Stable to a compact Evervale Village section with a few villagers and recurring cats.

## Acceptance Criteria

- Add a short, traversable countryside route from the existing clearing to one compact village area.
- Define a small typed set of villagers and cats as content, separate from world rendering and interaction logic.
- Villagers use the existing dialogue interaction; cats appear at fixed locations as incidental discoveries.
- Keep the first-ride quest, race, stable decorations, and existing movement behavior working.
- Use existing primitive rendering; do not add a pet system or expand beyond one village section.

## Relevant Files

- `src/scenes/WorldScene.ts`, reusable dialogue/rendering entities
- `src/data/` for route, villager, and cat definitions

## Allowed Changes

- Add only the route, a few NPCs, and recurring cat encounters needed for the birthday slice.
- Reuse existing Phaser movement, dialogue, and primitive rendering patterns.

## Do Not Implement

- Additional regions, a pet system, large quest chains, production art, or unrelated polish.

## Verification

- `npm run build`
- Launch in Chromium, travel between stable and village, interact with a villager, observe the cats, and confirm existing stable interactions still work.
