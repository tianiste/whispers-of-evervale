# Whispers of Evervale

An original, cozy horse adventure made as a birthday gift for Hana. This repository is the durable project memory; see the short startup set in `AGENTS.md` before taking a task.

## Run

Requires Node.js and npm.

```sh
npm install
npm run dev
```

Build with `npm run build`; check types with `npm run typecheck`. The deployable static site is written to `dist/`.

## Project map

- `src/`: Phaser runtime, starting with config and scenes.
- `public/assets/`: static assets served from `/assets/`.
- `docs/`: product, art, world, data, and current implementation contracts.
- `tasks/`: ordered backlog and the single active task.
- `handoffs/latest.md`: concise resume point for the next agent.

Desktop browser only. Saves will initially use local browser storage. No gameplay system has been implemented yet.
