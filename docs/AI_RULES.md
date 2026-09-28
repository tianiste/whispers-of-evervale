# AI working rules

`AGENTS.md` is the short authoritative contract. This file holds supporting conventions only.

- Read only the startup set, then relevant source and specific design docs. Search before opening large files; interfaces/types before implementation.
- Treat this repository as persistent memory and chat as temporary. Do not repeat docs in replies or use current state as a diary.
- Keep tasks isolated with explicit acceptance criteria, relevant files, allowed changes, exclusions, and verification. One task lives in `tasks/CURRENT_TASK.md`.
- Task tiers guide model cost: `cheap` for bounded repetitive/data/test work, `standard` for isolated features, `orchestrator` for architecture, schemas, migrations, and cross-system work. Delegate only when it helps; orchestrator reviews integrations.
- Use relevant specialized skills when they materially help. Project contracts take priority over generic skill advice.
- At completion, update concise handoff; update current state only when implementation reality changed materially. Do not claim unrun checks.
