# T012 — One Forgiving Checkpoint Race

agent_tier: standard
context_budget: medium

## Goal

Add one short, replayable horseback checkpoint race to the clearing.

## Acceptance Criteria

- Define a small typed race route and checkpoint sequence as content data.
- A mounted player can start the race at a marked start point using a displayed keyboard control.
- Checkpoints must be passed in order; show the current checkpoint and elapsed time while racing.
- Finishing shows a result and grants one horse apple through the existing inventory flow.
- Race state is runtime-only and does not change the first-ride quest flow.

## Relevant Files

- `src/scenes/WorldScene.ts`
- `src/data/` for the race route and checkpoints

## Allowed Changes

- Add the minimum race data, marker rendering, timing, HUD, and reward behavior.
- Reuse mounted movement and the existing inventory.

## Do Not Implement

- A race catalog, leaderboards, persistence, difficulty settings, or new race systems.

## Verification

- `npm run build`
- Launch in Chromium, start a race while mounted, pass checkpoints in order, and verify the finish result and inventory reward.
