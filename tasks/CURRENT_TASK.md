# T020 — Desktop Browser Fit, Usability, and Release Build Pass

agent_tier: standard
context_budget: medium

## Goal

Make the birthday slice comfortable to play in a desktop browser and confirm it can be built for release.

## Acceptance Criteria

- The 960×540 game canvas fits common desktop browser windows without clipping essential controls or HUD.
- Keyboard instructions and core interactions are understandable and usable.
- Production build completes and the built page starts without browser errors.
- No gameplay, quest, save, or art scope expansion.

## Relevant Files

- `src/config/gameConfig.ts`
- `src/style.css`
- `src/scenes/`

## Allowed Changes

- Focused scaling, layout, accessibility, or browser startup fixes needed for the acceptance criteria.

## Do Not Implement

- New regions, systems, content, or broad visual redesign.

## Verification

- `npm run build`
- In Chromium, inspect the release build at common desktop viewport sizes and exercise the basic keyboard flow.
