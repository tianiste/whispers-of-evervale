# T015 — Echo Mystery and Personalized Finale

agent_tier: orchestrator
context_budget: medium

Status: blocked pending the user-provided finale message and developer name.

## Goal

Add the Echo mystery quest and personalized birthday finale configuration/content.

## Acceptance Criteria

- Add one short Echo mystery quest that reveals the mystery gradually through existing quest and dialogue patterns.
- Keep recipient-specific text in editable gift configuration, separate from game logic.
- Use Hana as the recipient; leave optional nickname empty unless supplied.
- Use the user-provided final message and developer name without inventing either.
- Keep the quest and finale within the birthday slice and preserve existing gameplay.

## Relevant Files

- `src/data/` for quest, dialogue, and gift configuration
- `src/scenes/WorldScene.ts` and existing dialogue/quest runtime

## Allowed Changes

- Add only the Echo quest flow and configurable finale content needed for the slice.
- Reuse existing typed content, quest progress, dialogue, and reward patterns.

## Do Not Implement

- Additional regions, a large quest system, or hard-coded/invented personal finale values.

## Verification

- `npm run build`
- Launch in Chromium, complete the Echo quest, and verify finale configuration is used without changing the existing first-ride and race flows.
