# Release audit: birthday build

agent_tier: orchestrator
context_budget: medium

Status: fixes applied and validated, awaiting the user's review. This is a direct user request with an approved plan, not a backlog selection. The user commits and tags the release; do not commit, push or tag.

## Goal
Check that the October 1 build is ready to give to Hana, and fix only the critical or high-impact problems a full fresh-save playthrough turns up. No new features and no architecture changes.

## Allowed files
Rider art (`riders.png`, `rider-cream-*.png`), `riderAppearances.ts`, `village.ts` (Baker frame), `CharacterCreatorScene.ts`, `WorldScene.ts` (toasts, horse window text), `GameUI.ts` (toast duration), `style.css`, `scripts/verify-ui.mjs`, `docs/CURRENT_STATE.md`, `handoffs/latest.md`.

## Acceptance
- Hana is blonde in the world, the wardrobe and races, matching her Echo figure; the other two looks are unchanged and saves are unaffected.
- The creator works with the mouse.
- The race track text is readable, and dialog buttons have consistent spacing.
- Talk and inspect payoffs don't repeat as toasts, and chapter-end toasts keep the payoff and the reward.
- The horse window's paddock direction matches the quest.

## Validation
Typecheck, build, `npm test`, and the headless-Chrome fresh-save playthrough, with checks for browser errors and failed asset requests.
