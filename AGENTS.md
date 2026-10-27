# AGENTS.md

Instructions for every AI coding agent working in this repo (Claude Code, Codex, Cursor, Copilot, Gemini, and others).
This file is the single source of truth.
Tool-specific files (`CLAUDE.md`, `.claude/commands/`) only point here or wrap the workflows in `docs/workflows/`.

## What this is

Aethergate: a Hades-like roguelike played as an over-the-shoulder third-person spell shooter, in an original dark fantasy world.
Built on a browser game starter: Three.js (WebGPU with WebGL 2 fallback), Rapier physics (WASM), miniplex ECS, TypeScript, Vite, pnpm.

- Design: `docs/design/game-design.md`
- Milestones: `docs/milestones.md` (check which milestone is current before starting work)
- Key decisions: `docs/decisions/0002-tps-roguelike-scope.md`

`src/game/` is the game, `src/engine/` stays game-agnostic.

## Commands

| Command                                        | What it does                                                                                                          |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                     | Dev server with hot reload on http://localhost:5173 (test hook and `?debug` available)                                |
| `pnpm verify`                                  | **The full quality gate.** Format, lint, typecheck, unit, E2E, visual and perf checks. Must pass before work is done. |
| `pnpm test`                                    | Unit tests (Vitest), `src/**/*.test.ts`                                                                               |
| `pnpm e2e`                                     | Playwright gameplay and visual tests against the production build                                                     |
| `pnpm e2e:update`                              | Re-record visual baselines. Only when a visual change is intended, and say so in the PR.                              |
| `pnpm perf`                                    | Bundle size budget plus simulation CPU budget from `perf-budget.json`                                                 |
| `pnpm progress`                                | Regenerate the progress dashboard `docs/progress/dashboard.html` from milestones, log, specs, git and the last verify |
| `pnpm progress:verify`                         | Run `pnpm verify`, record the result and budget numbers, then regenerate the dashboard                                |
| `pnpm assets`                                  | Optimize models from `assets-src/models` into `public/assets/models`                                                  |
| `pnpm lint` / `pnpm typecheck` / `pnpm format` | Individual checks                                                                                                     |

## Workflow: Spec, Plan, Build, Verify

Every non-trivial change follows `docs/workflows/sdlc.md`.
In short:

1. **Spec**: write `docs/specs/NNNN-short-name.md` from the template. What and why, player-facing behavior, acceptance criteria. No code.
2. **Plan**: write `docs/plans/NNNN-short-name.md`. Files to touch, components and systems to add, tests to write, risks. Wait for human approval of spec and plan unless told otherwise.
3. **Build**: implement in small commits. Write or update tests alongside the code.
4. **Verify**: run `pnpm verify`, open the game and look at it (screenshots via Playwright are fine), tick every acceptance criterion in the spec.

Trivial fixes (typo, one-line bug with obvious cause) may skip spec and plan, but never skip Verify.

## Progress tracking (mandatory)

Progress is tracked in `docs/milestones.md` (checkboxes) and `docs/progress/log.md` (one line per work step), and shown in a generated dashboard.
Follow `docs/workflows/progress.md` (Claude Code: the `progress` skill):

- Start of every session: `pnpm progress`, then read the current milestone and the latest log entries.
- After every work step: update task markers and add a log line.
- Before handing back: `pnpm progress:verify`, and report the summary line.

## Architecture rules

- `src/engine/` is game-agnostic and must never import from `src/game/` (enforced by ESLint).
- Game code uses ECS: **components are plain data** in `src/game/components.ts`, **behavior lives in systems** (`src/game/systems/`, one system per file, one job per system).
- Entity factories live in `src/game/entities/`. They create the body and mesh and `world.add()` the entity. The engine adds `object3d` to the scene and renders `body` transforms blended between fixed steps, so game logic reads positions from `body`, never from `object3d`.
- Game-wide state that is not an entity (score, phase, timers) lives in `src/game/state.ts`.
- Tunables go in `src/game/config.ts`, never as magic numbers in systems. Expose useful ones in the debug panel in `src/game/index.ts`.
- System order is registered in `src/game/index.ts`. Order matters: input, then rules, then cosmetics, then camera.
- **Fixed systems** (`addFixedSystem`) run at 60 Hz and hold all gameplay logic. **Frame systems** (`addFrameSystem`) run once per rendered frame and only do presentation (camera, model facing, HUD). They must be pure functions of simulation state, `ctx.alpha` and `input.pendingLook`, and never change gameplay state. Anything else that affects gameplay or screenshots must be a fixed system.
- Use `ctx.rng` (seeded), never `Math.random()`, in game logic. Use `ctx.dt`, never wall-clock time.
- See `docs/architecture.md` for the full picture.

## Performance rules

- Reuse geometries and materials across entities (see `src/game/entities/level.ts` and `mannequin.ts`). Never create them per frame.
- No allocations in hot loops when avoidable: reuse vectors, avoid spreading arrays every step.
- Heavy or optional code (editors, debug tools, rarely used scenes) is loaded with dynamic `import()`.
- Use the debug overlay (backquote key or `?debug`) to check FPS, CPU and GPU time and draw calls.
- If `pnpm perf` fails, fix the regression. Raise a budget in `perf-budget.json` only with a justification in the PR.

## Testing rules

- Pure logic (math, rules, data transforms) gets Vitest unit tests next to the file (`foo.ts` and `foo.test.ts`).
- Player-facing behavior gets a Playwright test in `tests/e2e/`. Drive it through `window.__game` (see `src/engine/test-hook.ts`): open with `?test&seed=1&paused`, step time with `advance(n)` (or `advanceUntil` in `tests/e2e/helpers.ts`, which steps inside the page), read state with `inspect()`, trigger setups with `act(name, ...)`. Pointer lock and mouse look are simulated with the built-in `act('pointerLock', 1)` and `act('look', dx, dy)`.
- Add whatever state a new feature needs to `inspect()` and any setup shortcuts to `actions` in `src/game/index.ts`.
- Visual baselines live next to the specs. Changing them must be intentional.
- Never weaken, skip or delete a test to make it pass. A flaky test is a bug: find the source of the nondeterminism.

## URL parameters

| Param             | Effect                                           |
| ----------------- | ------------------------------------------------ |
| `?seed=123`       | Fixed RNG seed, reproduces a level layout        |
| `?debug`          | Opens the debug overlay at start                 |
| `?test`           | Exposes `window.__game` (always on in dev)       |
| `?paused`         | Simulation only advances via `__game.advance(n)` |
| `?renderer=webgl` | Forces the WebGL 2 backend                       |

## Code style

- TypeScript strict, no `any`, no non-null assertions without a reason the type system cannot see.
- Match the surrounding code. Comments explain why, not what.
- Conventional Commits (`feat:`, `fix:`, `perf:`, `refactor:`, `test:`, `docs:`, `chore:`), enforced by a commit hook.
- Keep pull requests small: one spec per PR where possible.

## Definition of done

- [ ] Acceptance criteria in the spec are met and ticked.
- [ ] `pnpm verify` passes locally.
- [ ] You looked at the running game, and nothing looks off (layout, z-fighting, flicker, console errors).
- [ ] New behavior is covered by tests, and new tunables are in `config.ts`.
- [ ] Docs updated if commands, architecture or conventions changed.
- [ ] `docs/milestones.md` and `docs/progress/log.md` updated, and `pnpm progress:verify` ran.
