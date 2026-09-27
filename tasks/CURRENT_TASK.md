# UI/UX and gameplay-feel pass

agent_tier: orchestrator
context_budget: medium

Status: complete after final validation; awaiting user acceptance. Do not advance the backlog.

## Goal
Make the existing birthday slice feel intentional through a minimal HUD, dedicated management windows, contextual feedback, race presentation, and responsive riding/camera feel.

## Allowed files
Task-relevant source in src/ui, src/scenes, src/entities, src/systems, src/style.css; focused verification in scripts; docs/CURRENT_STATE.md and handoffs/latest.md. Preserve save format and existing content. No new regions, economy, or dependencies.

## Acceptance
Clean normal HUD; separate inventory, wardrobe, horse, journal and pause windows; intentional dialogue; consistent keyboard/pointer interaction; race briefing/countdown/HUD/results; rewards and quest feedback; improved riding, walking and camera. Reflect existing shop/tack scope honestly.

## Validation
Build, typecheck, available tests, browser verification of windows, focus/close behavior, riding, race completion, persistence and console errors. Commit and push verified increments. Stop after this pass; do not advance the backlog.
