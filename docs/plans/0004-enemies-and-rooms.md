# 0004: Enemies and combat rooms (plan)

Spec: docs/specs/0004-enemies-and-rooms.md

## Approach

- **One `enemy` component** holds kind, AI state, a state timer and attack data. The AI is a pure function per kind (`src/game/ai/brains.ts`) that takes a small view of the world (positions, distances, the enemy's state) and returns the next state and a movement intent. Systems apply the intent. That keeps the decision logic unit-testable without Rapier.
- **States:** `rising`, `chase` (move per kind), `windup`, `attack`, `recover`, `stagger`, `dying`. Every attack goes through `windup` with a configured duration of at least 0.4 s, enforced by a unit test over the config.
- **Movement:** kinematic capsules moved by one shared Rapier character controller, so enemies collide with cover and each other. Separation steering pushes neighbours apart before the controller resolves contacts.
- **Attacks:** melee and area attacks resolve in one system at the moment `attack` starts, against the player's hurtbox, respecting dodge i-frames. The caster fires an enemy-team orb through the existing projectile pool.
- **Shield:** `applyDamage` gains a source position. If the target has an active guard and the source is inside its front arc, the hit is blocked. A bash passes `staggers: true`, which breaks the guard even when blocked.
- **Waves:** the arena layout lists spawn points; config lists waves as kind counts. A `waves` system owns the encounter state (`waiting`, `active`, `intermission`, `cleared`), spawns at points far from the player using the seeded RNG, and advances when a wave's enemies are gone.
- **Modes:** `?mode=training` builds the M2 courtyard (dummy, totem, no waves). Existing M1 and M2 tests use it; new tests use the encounter.
- **Visuals:** procedural graybox figures per kind with shared geometry and a per-enemy glow material for telegraphs and the hit flash. Poses (lean back in wind-up, lunge, collapse) are set from the AI state by a frame system. Ground markers are one shared ring mesh per enemy, shown during area wind-ups.
- **Bundle budget:** the entry chunk is the whole game (vendor libraries are separate chunks), so splitting it would only add a request waterfall. Raise `maxEntryGzipKB` from 25 to 60 with this justification.

## Changes

| File                                                                                               | Change                                              |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `perf-budget.json`                                                                                 | Entry budget 60 KB (see above)                      |
| `src/game/config.ts`                                                                               | Enemy kinds, waves, encounter timings               |
| `src/game/components.ts`, `state.ts`                                                               | `enemy`, `guard`; encounter state, mode             |
| `src/game/ai/brains.ts`, `steering.ts`                                                             | Pure AI and separation, with tests                  |
| `src/game/combat/damage.ts`                                                                        | Guard blocking, stagger                             |
| `src/game/entities/enemy.ts`                                                                       | Factory and procedural figures per kind             |
| `src/game/arenas/graybox.ts`                                                                       | Spawn points                                        |
| `src/game/systems/enemy-ai.ts`, `enemy-motion.ts`, `enemy-attack.ts`, `enemy-death.ts`, `waves.ts` | Fixed systems                                       |
| `src/game/systems/enemy-pose.ts`                                                                   | Frame system: poses, telegraph glow, ground markers |
| `src/game/ui/hud.ts`, `index.html`, `style.css`                                                    | Wave label, cleared banner                          |
| `src/game/index.ts`                                                                                | Modes, wiring, test actions                         |
| `tests/e2e/enemies.spec.ts`, `helpers.ts`, `visual.spec.ts`, `perf.spec.ts`                        | New tests, training mode for old ones               |

Fixed order: restart, waves, look, actions, locomotion, cast, focus, totem, enemy AI, enemy motion, enemy attack, projectiles, dummy, enemy death, death, feedback, player animation, footsteps, timer.

## Tests

| Acceptance criterion | Test                                                                       |
| -------------------- | -------------------------------------------------------------------------- |
| Start after lock     | `enemies.spec.ts` › "waves wait for the pointer lock"                      |
| Rising               | `enemies.spec.ts` › "rising enemies are untouchable"                       |
| Soldier              | `enemies.spec.ts` › "soldiers telegraph before they hit"                   |
| Dodge the lunge      | `enemies.spec.ts` › "dodging a lunge avoids damage"                        |
| Caster               | `enemies.spec.ts` › "casters keep their distance"                          |
| Knight               | `enemies.spec.ts` › "knight shields block from the front"                  |
| Hound                | `enemies.spec.ts` › "hounds are faster than soldiers"                      |
| Stagger              | `enemies.spec.ts` › "a bash interrupts a wind-up"                          |
| Clear                | `enemies.spec.ts` › "clearing three waves clears the chamber"              |
| Removal, restart     | `enemies.spec.ts` › "dead enemies are removed", "R restarts the encounter" |
| Separation           | `enemies.spec.ts` › "enemies keep apart"                                   |
| Unit                 | `brains.test.ts`, `steering.test.ts`, `damage` guard test                  |
| Perf                 | `perf.spec.ts` › "30 enemies and 200 projectiles"                          |
| Visual               | `visual.spec.ts` › "wave fight with a telegraph"                           |

## Risks

- 30 character-controller queries per step: measure in the perf test; fall back to cheaper sliding if needed.
- Enemies stuck on cover without pathing: keep cover sparse near spawn points; revisit with a flow field if playtests show it.
- Old tests depend on the dummy at a fixed spot: they move to `?mode=training`.

## Changes during build

- Enemies got their own collision group and no longer collide with each other. Six enemies spawned on one spot locked each other inside the character controller forever; separation steering now keeps them apart, with a golden-angle direction per enemy when exactly stacked. Enemies still collide with the level and the player.
- Added a "detour" to steering: an enemy blocked by cover for 0.35 s walks sideways along it for 0.8 s. A knight spawned behind the angled low wall moved 1.2 m in 2.5 s before, and walks around it in about 2 s now. One spawn point moved off that wall.
- Debug option "freeze enemies" (`config.enemy.frozen`) for tuning and deterministic shield tests.
- The test hook gained `advanceSync`, and `advanceUntil` now steps inside the page in one round trip. Tests that stepped one evaluate at a time hit the 30 s timeout under load.
- Playwright runs three workers: the suite is CPU-bound by software rendering, and 3, 4 and 6 workers all take about 2.3 minutes while more workers push long tests toward the timeout. Perf tests run serially so their CPU timings are not disturbed by each other.
