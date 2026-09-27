# T019 — Birthday Slice Atmosphere Polish

agent_tier: standard
context_budget: medium

## Goal

Add a restrained atmosphere pass to the existing stable clearing using the established pixel-art direction: subtle ambience, a small idle animation, and quiet environmental audio.

## Acceptance Criteria

- The clearing has a subtle ambient visual effect and an idle motion cue that fit the documented style.
- Environmental audio is quiet, loops cleanly, and does not interfere with interaction or race feedback.
- Existing controls, quest progression, saving, and race behavior remain unchanged.
- No new dependency is added unless the current platform cannot provide the needed behavior.

## Relevant Files

- `src/scenes/WorldScene.ts`
- `src/data/` and `public/assets/` for any required content

## Allowed Changes

- Add only the small visual and audio assets or runtime behavior needed for this atmosphere pass.

## Do Not Implement

- New regions, systems, or broad art replacement.

## Verification

- `npm run build`
- In Chromium, verify the ambience, idle motion, audio playback, and existing gameplay controls.
