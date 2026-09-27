# T016 — Echo Completion Reward and Post-Finale Free Roam

agent_tier: standard
context_budget: small

## Goal

Reward completion of “A Familiar Echo” with one existing horse apple and let the player continue exploring after closing Hana’s finale note.

## Acceptance Criteria

- Reaching the old oak completes the Echo quest and grants exactly one horse apple.
- The finale note remains visible until Enter or Space closes it; afterward, normal movement and interactions resume.
- Re-triggering nearby interactions or revisiting the oak does not grant additional completion rewards.
- First-ride and race rewards remain unchanged.

## Relevant Files

- `src/data/quests.ts`
- `src/scenes/WorldScene.ts`

## Allowed Changes

- Reuse the typed item inventory and existing quest completion flow.
- Keep the reward runtime-only like current inventory.

## Do Not Implement

- Saving, new item types, additional regions, or expanded quest infrastructure.

## Verification

- `npm run build`
- In Chromium, complete the Echo quest, verify one additional horse apple, close the note, then move and interact normally.
