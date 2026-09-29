# Handoff

## GitHub Pages deployment repair

The user requested fixing the live game after pushing the birthday build. The authoritative repository is `whispers-of-evervale/whispers-of-evervale`.

The live domain was serving the repository's raw index.html, which referenced `/src/main.ts`. There was no checked-in Vite deployment workflow, so the latest game commit was not deployed.

Added `.github/workflows/pages.yml`: pushes to main or manual dispatch install locked dependencies with Node 22, run typecheck and content tests, build, and publish only `dist` with the official Pages actions. Vite base is `/` for the existing custom domain. Existing Pages configuration already uses workflows and HTTPS at https://evervaleforhana.me/; DNS and domain settings are preserved.

Local typecheck, tests and production build pass. Vite retains its existing large-bundle advisory; there is no lint script. Deployment and live browser verification follow the workflow push.

Gameplay is unchanged. The prior release audit recorded two successful full fresh-save browser playthroughs. Local `.claude/` and `skills-lock.json` remain untracked tooling, outside this deployment change.
