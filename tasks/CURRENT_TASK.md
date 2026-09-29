# Batch 3A: campaign backbone and Echoes I–III

agent_tier: orchestrator
context_budget: medium

Status: complete and validated; the user played the build and reported it working. This was a direct user request, not a backlog selection. Do not advance the backlog until the user accepts it.

## Goal
Restore a compiling build on the current 1800×1100 map. Implement the opening quests (Welcome to Sunmeadow, Meet Your Horse, Make It Yours), a reusable data-driven Echo framework and Echoes I–III, the five real cats, and explicit Echo save state. After Echo III, show a temporary "more Echoes are stirring" beat and return to free roam. The birthday ending stays reserved for Echo VI.

## Allowed files
Task-relevant content, scenes, UI, art modules, entities and save compatibility in src. Verification scripts and the package test script. Docs: CURRENT_STATE, QUEST_DESIGN, PERSONALIZATION, DATA_SCHEMAS, handoff. No dependencies and no world expansion.

## Acceptance
- Opening quests work; horse choice is in-world with Sky pre-filled and renameable; the creator only creates Hana.
- Echoes I–III are playable, with setup, steps, affectionate retryable wrong answers, completion, keepsake and return.
- Leaving or reloading mid-Echo resumes at the next step; restored Echoes persist explicitly.
- The memories become suspiciously personal without a full reveal.
- There are clear extension points for Echoes IV–VI.

## Validation
Typecheck, build, `npm test`, and the headless-Chrome fresh-save playthrough through Echo III with a browser error check. Commit locally only; the user asked for no push.
