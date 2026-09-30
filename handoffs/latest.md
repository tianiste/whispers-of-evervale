# Handoff — main merged into sound

The user requested bringing `main` into `sound`. The attempted rebase was aborted at the user's direction; this is a normal merge that preserves published history. `main` contributes the GitHub Pages workflow, custom domain, root Vite base and horseshoe favicon. The audio implementation remains unchanged from the previous `sound` tip (`a3c2166`).

Both branches contained the same birthday build under different commits. This caused content and add/add conflicts. For every conflicted runtime/test file, the version on `main` was verified byte-for-byte against the pre-audio birthday commit (`d057d1e`), then the audio-enabled version was retained. Current state now includes both audio and deployment context. No backlog advancement or new task selection.

## Validation

After merging, `npm run typecheck`, `npm test`, `npm run build` and whitespace checks pass. Runtime and test files have no diff from the previous `sound` tip. The production favicon is present and linked. Vite retains its existing bundle-size advisory; there is no lint script. Browser/audio suites were not rerun for this merge.

The earlier audio validation completed all 46 objectives and postgame, followed by targeted menu checks after fixing a test-driver reload race. Dedicated audio checks passed for 81 buffers, mute/category persistence, crossfades, cleanup and voice limits. These are previous results, not new merge validation.

## Durable context

Audio uses Phaser's Web Audio context with original synthesized cues, regional/music beds and persistent master/music/effects/ambience/mute controls. See `docs/AUDIO.md`. Animal voices and Foley are synthesized approximations; no human headphone audit was performed.

Pages deploys only `dist` on pushes to `main` or manual dispatch, at `evervaleforhana.me`. Pushing `sound` does not automatically deploy it. Unrelated `.claude/` and `skills-lock.json` remain untracked.
