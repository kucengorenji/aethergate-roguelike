# 0007: Boons and status effects (plan)

Spec: docs/specs/0007-boons.md

## Approach

- **Boons are data plus hooks.** `src/game/boons/data.ts` lists demigods and blessings (id, slot, text). Effects live in one module of hook functions (`boons/effects.ts`) called at fixed points: a bolt lands, a burst happens, a roll starts or ends, a bash lands, and a damage multiplier for player hits. Systems stay unaware of individual boons.
- **Pure cores with tests.** Offer generation (`boons/offer.ts`) and status math (`boons/status.ts`) are pure functions with unit tests. The status system only applies their results to entities.
- **Status component on enemies** (chill, weight, rot, frozen). Chill and freeze scale the enemy's own time (wind-ups, cooldowns) and speed, so a chilled enemy's telegraph lasts longer instead of being skipped.
- **Arcs** are short-lived line segments in state, drawn by the projectile renderer with one instanced mesh; they never trigger further arcs.
- **Choice flow:** a Blessing reward opens `state.choice`; the run waits for it before opening doors; player control systems pause while it is open; keys 1 to 3 choose.
- **Test hooks:** `grantBoon`, `offerBoons`, `choose`, plus status fields in `inspect()`.

## Changes

| File                                                                                                                              | Change                                                |
| --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `src/game/boons/data.ts`, `offer.ts`, `status.ts`, `effects.ts`                                                                   | Data, offers, status math, effect hooks               |
| `src/game/components.ts`, `state.ts`, `config.ts`                                                                                 | `boons`, `status`; choice and arcs; tunables          |
| `src/game/systems/status.ts`, `boon-choice.ts`                                                                                    | Status ticking; choosing with keys                    |
| `src/game/systems/projectiles.ts`, `actions.ts`, `cast.ts`, `skill.ts`, `enemy-ai.ts`, `enemy-motion.ts`, `feedback.ts`, `run.ts` | Hooks, slow and freeze, tints, waiting for the choice |
| `src/game/combat/burst.ts`                                                                                                        | Element-aware burst                                   |
| `src/game/systems/projectile-render.ts`                                                                                           | Arcs, comet color by element                          |
| `src/game/ui/boons.ts`, `index.html`, `style.css`                                                                                 | Choice cards, held blessings list                     |
| `tests/e2e/boons.spec.ts`, `visual.spec.ts`, `perf.spec.ts`                                                                       | Behavior, baselines, perf with statuses               |

## Risks

- Many interacting effects: keep each hook small and test each blessing through its visible outcome (health, position, state).
- Arcs and rot add damage events every step: the perf test covers 30 enemies with rot and chill.

## Changes during build

- Found while wiring 0007: two edits from spec 0006 had silently not applied (a script replaced text without checking it matched). Comets in flight were never drawn and comet bursts used the orb flash. Fixed, and edits are now made with assertions or the Edit tool.
- A unit test now checks that every sound the game plays is registered (`src/game/sounds.test.ts`); it caught five missing sounds immediately.
- The projectile system read every target's position from Rapier inside the projectiles-times-targets loop (6,000 wasm calls and allocations per step with 30 enemies); positions are now read once per step, which cut the heavy perf scenario from 1.7 to 1.1 ms per step.
- Heavy perf scenarios step the simulation inside the page instead of timing the live loop. The budget is CPU time per step; in the live loop, rendering and other load interleave and inflate the numbers (`main` failed the same way while another agent ran its suite).
- `shootOnce` in the E2E helpers holds fire until the cast happens: hitstop from the previous hit can stretch the cast cooldown past a fixed wait.
- Frozen enemies can still be pushed by knockback; only their own movement and actions stop.
