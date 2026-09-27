# T017 — Versioned Local Save/Load and Recovery

agent_tier: orchestrator
context_budget: medium

Status: blocked pending the persistence contract.

## Goal

Persist the agreed birthday-slice progress locally with versioning and safe recovery.

## Decisions Required Before Implementation

- Which runtime state survives restart: character/horse selection, quest progress, inventory, outfit, stable decorations, and race state?
- Should invalid or unsupported save data reset to defaults, preserve a backup, or prompt the player?

## Relevant Files

- `src/data/` state definitions
- `src/scenes/` initialization and runtime state

## Do Not Implement

- Cloud sync, accounts, or post-birthday expansion.

## Verification

- To define after the persistence contract is agreed.
