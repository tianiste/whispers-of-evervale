# Agent contract

- Start with `AGENTS.md`, `docs/CURRENT_STATE.md`, `tasks/CURRENT_TASK.md`, and `handoffs/latest.md`. Then inspect only relevant source; load other docs or skills only when useful.
- Follow the current task's goal, allowed files, and acceptance criteria. Do not start unrelated work or expand the game beyond the birthday vertical slice.
- Keep diffs small, reuse existing patterns, and keep content data separate from runtime logic. Do not add dependencies without a concrete need. Use strict TypeScript; avoid `any`.
- For implementation, verify the smallest relevant behavior and run the required project checks. Never claim a check that was not run.
- Delegate only bounded work when the environment supports it and delegation reduces cost or context. Set a task tier (`cheap`, `standard`, `orchestrator`) as guidance; the orchestrator owns architecture and integration and reviews delegated changes.
- Use Phaser skills for Phaser-specific work and Ponytail/frontend-design guidance for UI work when they materially help. Avoid unrelated skills.
- Repository files are persistent project memory. Keep `CURRENT_STATE.md` factual (500–1000 words max), `handoffs/latest.md` concise (300–500 words max), and `CURRENT_TASK.md` to one task. Do not turn either into a changelog.
- At meaningful task completion, update the handoff and materially changed current state. Keep docs in their assigned ownership files; avoid duplication.

## Autonomous Task Loop

Autonomous mode is opt-in: run the loop only when the user explicitly starts it. Otherwise complete the current task only; do not auto-advance.

For each autonomous task, treat it as a fresh context boundary:

1. Read only `AGENTS.md`, `docs/CURRENT_STATE.md`, `tasks/CURRENT_TASK.md`, and `handoffs/latest.md`; inspect only task-relevant files. Search before opening large files, inspect interfaces/types before large implementations where practical, and avoid rereading stable design docs or quoting large content.
2. Complete only the current task. Use skills only when materially useful: Phaser for game-engine work, Ponytail/frontend-design for UI/UX work, and no skill for trivial tasks. Delegate clearly scoped or repetitive work to smaller/cheaper models when available and beneficial.
3. Run relevant build, typecheck, tests, and lint checks where applicable. Fix problems caused by the current task. After three consecutive failed attempts on the same issue, stop.
4. Update `docs/CURRENT_STATE.md` only when project reality materially changes, and update `handoffs/latest.md` with concise durable context.
5. After successful validation, mark the task complete in `tasks/BACKLOG.md`, commit only task-related changes with a concise message, then push the current branch if a remote and credentials are available.
6. Select the highest-priority unfinished task advancing the October 1 birthday vertical slice, write it to `tasks/CURRENT_TASK.md`, and continue without asking the user.

Keep handoffs concise; repository files are persistent memory. Do not carry unrelated implementation details across task iterations. Default `max_tasks_per_run: 5`: after five successfully completed tasks, write the next task into `tasks/CURRENT_TASK.md` and stop cleanly. This is a checkpoint, not an error. Stop when all birthday vertical-slice tasks are complete.

Stop autonomous mode safely when validation repeatedly fails and cannot be fixed confidently; a merge conflict occurs; Git authentication or remote access blocks progress; a destructive migration is required; required personal/content information is missing; an architectural decision or important contract would require guessing; or the current/next task introduces a major irreversible architectural change. Do not guess. Update `handoffs/latest.md` with the blocker and leave `tasks/CURRENT_TASK.md` pointing at the blocked/current task unless another task is clearly safe.

## Task metadata

Every task supports `agent_tier: cheap | standard | orchestrator` and `context_budget: tiny | small | medium`. Use `cheap` for content definitions, repetitive data, simple tests, obvious fixes, or trivial utilities; `standard` for normal isolated implementation; and `orchestrator` for architecture-sensitive or cross-system work. Use `tiny` for very few files and almost no design context, `small` for a focused task, and `medium` for multiple related systems or architectural context. Do not use `large` unless a future task genuinely requires it.

## Git workflow

After a task is complete and verified:

- commit only files related to the task
- use a concise descriptive commit message
- push to the current branch if a remote is configured
- never force-push
- never rewrite history
- never push failing or incomplete work
- do not commit secrets, generated credentials, or unrelated files
- do not include unrelated working-tree changes unless necessary for the task

## Manual task advancement

In normal one-task mode, do not automatically start or select a new task after completing the current one. Advance only when explicitly instructed that the current task is accepted.

Only advance the backlog when explicitly instructed that the current task is accepted.

When advancing:

1. Read:
   - `tasks/BACKLOG.md`
   - `docs/CURRENT_STATE.md`
   - `handoffs/latest.md`

2. Choose the highest-priority unfinished task that best advances the October 1 birthday vertical slice.

3. Write it into `tasks/CURRENT_TASK.md` using the standard task format.

4. Keep the task narrow enough for one focused AI session.

5. Do not implement the newly selected task.

6. Stop after updating `tasks/CURRENT_TASK.md`.
