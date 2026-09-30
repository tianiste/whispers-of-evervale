# Cohesive game audio pass

agent_tier: orchestrator
context_budget: medium

Status: complete and validated. Direct user request; no backlog advancement. Commit and push the complete game/audio work to feature branch `sound` after validation.

## Goal
Add warm, cohesive, original sound feedback and atmosphere across the existing birthday game. Preserve gameplay, story and quest order; add no dependencies. Extend existing synthesis with a small shared mixer.

## Allowed files
Audio/settings data and systems, existing scene/entity/minigame/UI audio hooks, browser/content validation scripts, audio documentation, current state and handoff. Existing staged birthday-release work is part of the branch requested by the user; leave unrelated local tooling files alone.

## Acceptance
Menu/creator/horse selection, movement, riding, races, grooming, panels, quests, animals, every Echo/minigame, finale and postgame have appropriate sound. Master/music/effects/ambience and mute persist. Autoplay is gesture-gated, identical cues are throttled, scene beds crossfade, and unavailable audio cannot block gameplay.

## Validation
Typecheck, production build, content/settings tests, fresh-save Chrome campaign with audio, console/network checks, zero-volume/mute/persistence/rapid-interaction tests. Record actual results and remaining noncritical limits in the handoff.
