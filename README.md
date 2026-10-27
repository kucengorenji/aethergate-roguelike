# Aethergate

A Hades-like roguelike played as an over-the-shoulder third-person spell shooter, set in an original dark fantasy world of fallen demigods.
Runs in the browser on a normal laptop (60 fps at 1080p on a modern integrated GPU).

- Design: [`docs/design/game-design.md`](docs/design/game-design.md)
- Milestones: [`docs/milestones.md`](docs/milestones.md)
- Progress dashboard: run `pnpm progress`, then open `docs/progress/dashboard.html`
- Decisions: [`docs/decisions/`](docs/decisions/)

## Tech

- **Three.js** with `WebGPURenderer` (automatic WebGL 2 fallback)
- **Rapier** physics (WASM), **miniplex** ECS, **TypeScript**, **Vite**, **pnpm**
- Deterministic fixed-step loop, seeded RNG, `window.__game` test hook
- Debug overlay: FPS/CPU/GPU stats, live tweak panel, physics wireframes (backquote key)
- Quality gate: Prettier, ESLint, typecheck, Vitest, Playwright gameplay and visual tests, bundle and CPU budgets

## Quick start

```bash
corepack enable
pnpm install
pnpm exec playwright install chromium
pnpm dev
```

Open http://localhost:5173.
Click to lock the mouse, move with WASD, look with the mouse, reset with R, release the mouse with Esc, toggle debug with the backquote key.

## Working on the game

1. Read `AGENTS.md` (also what agents read).
2. Pick the next item from `docs/milestones.md` and write a spec: copy `docs/specs/_template.md`, or run `/spec <idea>` in Claude Code.
3. Keep `pnpm verify` green.

## Docs

- `AGENTS.md`: rules and commands for agents and humans
- `docs/workflows/sdlc.md`: the Spec, Plan, Build, Verify flow
- `docs/architecture.md`: engine layers, frame loop, ECS, adding a feature
- `docs/team-workflow.md`: branching, commits, reviews, onboarding
