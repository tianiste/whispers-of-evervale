# Handoff — audio pass on `sound`

The user requested a full audio polish pass, preserving gameplay/story and adding no dependencies, then explicitly asked for all game/audio work to be pushed to feature branch `sound`. The completed work is on branch `sound`. The older staged birthday build and release-audit changes were preserved; unrelated `.claude/` and `skills-lock.json` remain untracked. Game prerequisites (`d057d1e`) and the audio pass (`c6d0841`) are committed separately and pushed to `origin/sound`.

## Implemented

- Original synthesized cue palette and soundscape profiles in `src/data/audio.ts`; mixer in `src/systems/audio.ts`, on Phaser's existing context/master destination. Existing `tone()` calls now use its effects bus.
- Master/music/effects/ambience and mute in title/pause settings, saved separately from the adventure. Legacy master-only preferences migrate; malformed fields default safely.
- Trusted-gesture unlock, caught resume failures, blur silence, category ramps, crossfading beds, one-shot cooldowns/variation, voice cap and compressor.
- Menu/creator/horse cards, walking/riding, horse care, panels, dialogue/quests, rewards, decoration, race tracks, grooming, trails and animals have cues.
- All Echo settings/minigames have material effects; Echo V switches cards/snow/kitchen atmosphere. Echo VI ducks the two held lines, then reveals the card/gifts with restrained cues and returns to normal world ambience.
- `docs/AUDIO.md` describes sound direction, integration and the synthesized/terrain approximations. Data schemas and art direction are updated.

## Validation

Typecheck, production build, content/settings tests and whitespace checks pass. Vite retains its existing bundle-size advisory; there is no lint command. The audio-enabled fresh-save Chrome run completed all 46 objectives, six Echoes/minigames, birthday reveal, animals, postgame Moonlight Derby, completed-save reload and responsive panels. Its final menu refresh hit a test-driver race (the old page briefly still reported MainMenu). The shared reload helper now clears the test handle before navigation. The remaining menu/settings/refresh/New Game checks passed from the actual completed-run checkpoint, with no console/network errors. This was a campaign run plus targeted final-menu continuation, not a single uninterrupted green script run. Screenshots in `/tmp/evervale-audio-after` include inspected settings and finale; logs are `/tmp/evervale-audio-playthrough.log` and `/tmp/evervale-menu-continuation.log`.

`scripts/verify-audio.mjs` passes: gesture-required unlock, actual-output mute/master zero, category zero and persistence, crossfades, throttling, source cleanup and all 81 generated buffers. A full-volume mixed burst peaked at 0.358, below clipping; no console/network errors. Tests intercept the loaded audio module to expose a test-only accessor, avoiding duplicate Vite module instances. No production debug handles or external audio asset paths were added.

## Limits

Animal voices and material Foley are synthesized approximations; terrain variation uses existing regional positions. No human headphone audit was performed. No backlog advancement or new task selection. Keep unrelated local tooling files untracked.
