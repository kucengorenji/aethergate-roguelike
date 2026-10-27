# 0005: Run structure (plan)

Spec: docs/specs/0005-run-structure.md

## Approach

- **The plan is pure data from the seed.** `src/game/run/plan.ts` turns a seed into 8 room plans (kind, layout, waves, reward) plus the two door offers after each room. Unit-tested without the engine.
- **Rooms are loadable.** The environment (sky, lights, fog, distant tree) is built once. Each room's geometry is entities tagged `room`, so leaving a room removes exactly those entities, their meshes and bodies. Layouts move to `src/game/arenas/` with a registry; each layout lists its entrance, enemy spawns and door slots.
- **The current layout lives in state.** Systems that used the courtyard constant (waves, restart, reset) read `state.layout` instead.
- **Run flow is one state machine** in `systems/run.ts`: `fighting`, `reward`, `choosing`, `transition`, `complete`. It reacts to the encounter (from spec 0004), which now gets its waves from the room plan instead of the config.
- **Interaction** (`systems/interact.ts`): walking into a reward token takes it; E near an open door chooses it.
- **Transition** is a fixed-step timer (deterministic in tests) with a DOM fade driven from it.
- **Modes:** `run` becomes the default; `encounter` keeps the single chamber so its tests stay meaningful.

## Changes

| File                                                   | Change                                                                 |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `src/game/arenas/types.ts`, `layouts.ts`, `graybox.ts` | Layout types, 6 combat layouts plus grace, elite and boss, registry    |
| `src/game/run/plan.ts`, `rewards.ts`                   | Run plan from seed; reward labels, colors and effects                  |
| `src/game/entities/level.ts`                           | Environment once, arenas as `room` entities, despawn                   |
| `src/game/entities/door.ts`, `pickup.ts`               | Door arches with reward portals; reward tokens                         |
| `src/game/systems/run.ts`, `interact.ts`               | Room flow and transitions; pickups and doors                           |
| `src/game/systems/waves.ts`, `restart.ts`              | Waves from the room plan, spawns from the current layout, new run on R |
| `src/game/components.ts`, `state.ts`, `config.ts`      | `room`, `door`, `pickup`; run state; rewards and wave budgets          |
| `src/game/ui/hud.ts`, `index.html`, `style.css`        | Room label, counters, door prompt, fade, run complete                  |
| `src/game/index.ts`                                    | Run mode default, wiring, test actions                                 |
| `tests/e2e/run.spec.ts`, `visual.spec.ts`              | Run tests and baselines                                                |

## Tests

| Acceptance criterion    | Test                                                            |
| ----------------------- | --------------------------------------------------------------- |
| Plan shape, determinism | `src/game/run/plan.test.ts`                                     |
| Reward token, doors     | `run.spec.ts` › "clearing a room offers its reward, then doors" |
| Grace room              | `run.spec.ts` › "grace rooms reward without a fight"            |
| Room change             | `run.spec.ts` › "a door loads the next room"                    |
| Reward effects and HUD  | `run.spec.ts` › "rewards change the run"                        |
| Full run                | `run.spec.ts` › "a seeded run reaches the Aethergate"           |
| Same seed               | `run.spec.ts` › "the same seed plays the same run"              |
| Death and new run       | `run.spec.ts` › "dying starts a new run"                        |
| Visual                  | `visual.spec.ts` › "door choice", "grace room"                  |

## Risks

- Removing and re-adding many static bodies per room: check the step time around transitions in the perf test.
- Spawning the player inside cover of a new layout: every layout's entrance is checked free by a unit test against its boxes.

## Changes during build

- Paused test sessions now render only when a test asks for a frame (`Game.requestFrame`, used by the test hook). A software-rendered headless frame takes about 130 ms, and rendering every animation frame queued each test round trip behind it: the full-run test timed out at 90 s and finishes in 14 s now; the whole E2E suite went from 2.5 minutes to 44 s.
- Static level bodies live in a `room` component instead of `body`, so the engine does not interpolate level geometry and `despawnRoom` removes exactly the room's bodies.
- The grace room's entrance was 4 m from its back wall, so the shoulder camera (4.2 m back) showed the wall edge. It is now 6 m away, and a layout test enforces at least 5 m in every layout.
- The first room change of a session costs one step of about 65 ms (one-off warm-up, hidden by the black fade); later room changes stay under 1.1 ms.
- R does nothing while alive in a run, so a stray key press cannot throw a run away; it starts a new run after death or victory.
