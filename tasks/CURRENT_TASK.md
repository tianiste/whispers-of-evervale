# T018 — End-to-End Birthday Slice Stability Pass

agent_tier: standard
context_budget: medium

## Goal

Verify the birthday slice works from character creation through the finale and save recovery, fixing only issues that block those flows.

## Acceptance Criteria

- Verify character/horse selection, first-ride objectives and reward, and race checkpoint order/reward.
- Verify Echo unlocks after the first ride, clues progress in order, and the finale note/reward complete correctly.
- Verify a reload resumes saved progress and malformed or unsupported data starts a new game.
- Confirm no uncaught browser exceptions during these flows.

## Relevant Files

- `src/scenes/`
- `src/data/`

## Allowed Changes

- Fix only regressions found in the end-to-end flow.

## Do Not Implement

- New gameplay systems, regions, art, or dependencies.

## Verification

- `npm run build`
- Complete the flows in Chromium and inspect browser exceptions.
