# 0002: TPS graybox (plan)

Spec: docs/specs/0002-tps-graybox.md

## Approach

Engine first, then game.
The engine gains four game-agnostic pieces: mouse input with pointer lock, render interpolation, animation mixers updated on the fixed step, and a small Web Audio module.
The game layer replaces the gem demo with a kinematic character, an over-the-shoulder camera, a handcrafted graybox arena and a procedural mannequin.

Key choices:

- **Mouse look is consumed per fixed step** (deterministic aim for later shooting). To avoid a step of input latency, the camera adds the not-yet-consumed mouse delta when rendering (`input.pendingLook`). In tests that delta is always zero after `advance()`, so screenshots stay deterministic.
- **Interpolation lives in the engine.** Before each physics step the engine snapshots body transforms, and each frame it blends previous and current by `alpha`. When paused, `alpha` is 1, so tests and screenshots see exactly the latest step. Fixed systems must read positions from bodies, never from `object3d`.
- **Animation mixers update on the fixed step**, not per frame, so screenshots at a given tick are identical everywhere (AGENTS.md rule). This deviates from the milestone wording ("frame system"), on purpose.
- **Kinematic character controller** (Rapier `KinematicCharacterController`, capsule collider) with manual gravity, autostep and snap-to-ground.
- **Camera is a frame system** that is a pure function of simulation state, interpolated player position and pending look. It ray casts from the shoulder pivot to push in before walls.
- **Pointer lock in tests**: Playwright cannot rely on real pointer lock, so the test hook can simulate it (`act('pointerLock', 1)`) and inject look deltas (`act('look', dx, dy)`).

## Changes

| File                                                | Change                                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/engine/input.ts`                               | Mouse buttons (`Mouse0`, `Mouse2`), pointer lock, look delta per step, inject for tests                 |
| `src/engine/fixed-step.ts`                          | `alpha` (leftover fraction), forced to 1 while paused                                                   |
| `src/engine/interpolation.ts`                       | New: previous and current body transforms, blend onto `object3d`                                        |
| `src/engine/animation.ts`                           | New: `Animator` (mixer, named actions, cross-fade, time scale)                                          |
| `src/engine/audio.ts`, `synth.ts`                   | New: lazy AudioContext unlocked on gesture, sounds, music, master volume; procedural placeholder sounds |
| `src/engine/ecs.ts`                                 | `animator` core component                                                                               |
| `src/engine/game.ts`                                | Interpolation, animator updates, `audio` and `alpha` on the context, pointer lock target                |
| `src/engine/test-hook.ts`                           | Built-in `pointerLock` and `look` actions                                                               |
| `src/game/components.ts`, `config.ts`, `state.ts`   | Player, look and locomotion components; arena, player, camera tunables                                  |
| `src/game/arenas/graybox.ts`                        | New: handcrafted arena layout data                                                                      |
| `src/game/entities/level.ts`                        | Builds an arena from layout data, golden-hour light and fog                                             |
| `src/game/entities/player.ts`, `mannequin.ts`       | Kinematic capsule plus procedural mannequin with idle and run clips                                     |
| `src/game/systems/look.ts`                          | Mouse delta to yaw and pitch                                                                            |
| `src/game/systems/locomotion.ts`                    | WASD relative to yaw, gravity, character controller                                                     |
| `src/game/systems/player-animation.ts`              | Picks idle or run, faces the model to yaw                                                               |
| `src/game/systems/footsteps.ts`                     | Footstep sounds on run cadence                                                                          |
| `src/game/systems/restart.ts`                       | R resets to spawn                                                                                       |
| `src/game/systems/tps-camera.ts`                    | Over-the-shoulder camera with push-in (frame system)                                                    |
| `src/game/ui/hud.ts`, `index.html`, `src/style.css` | Crosshair, click-to-play prompt, controls hint, new palette                                             |
| Removed                                             | gem entity, collect, gem animation, timer, camera follow, player control                                |
| `tests/e2e/*`                                       | New gameplay tests, new visual baselines, perf test uses W                                              |
| `docs/architecture.md`, `AGENTS.md`                 | Interpolation, frame system rule, test actions                                                          |
| `docs/specs/0001-gem-roller-demo.md`                | Status `superseded`                                                                                     |

System order (fixed): restart, look, locomotion, player animation, footsteps. Frame: TPS camera, HUD.

## Tests

| Acceptance criterion     | Test                                                            |
| ------------------------ | --------------------------------------------------------------- |
| Spawn idle on floor      | `tests/e2e/gameplay.spec.ts` › "spawns idle on the floor"       |
| Move relative to look    | `gameplay.spec.ts` › "W moves where the camera looks"           |
| Diagonal speed           | `gameplay.spec.ts` › "diagonals are not faster"                 |
| Walls block              | `gameplay.spec.ts` › "walls keep the player in the arena"       |
| Step up, blocked by wall | `gameplay.spec.ts` › "climbs small steps, not walls"            |
| Pitch clamp              | `gameplay.spec.ts` › "pitch is clamped"                         |
| Camera push-in           | `gameplay.spec.ts` › "camera pushes in before walls"            |
| Idle and run             | `gameplay.spec.ts` › "run animation while moving"               |
| Click-to-play prompt     | `gameplay.spec.ts` › "prompt shows until the pointer is locked" |
| Interpolation alpha      | `src/engine/fixed-step.test.ts`                                 |
| Input                    | `src/engine/input.test.ts`                                      |
| Synth sounds are valid   | `src/engine/synth.test.ts`                                      |
| Visual                   | `tests/e2e/visual.spec.ts` › "arena from the shoulder"          |

## Risks

- Rapier character controller API details (0.21): verify against the typings before use.
- Shadow map coverage for a 40 m arena on iGPUs: one 2048 directional shadow fitted to the arena, check acne and peter-panning in the screenshot.
- Interpolation plus teleports (R reset) can smear for one frame. Acceptable, revisit if visible.

## Changes during build

- Rapier skips autostep when the requested movement has any downward component, so a grounded character now requests zero vertical speed and relies on snap-to-ground. Found by the "climbs small steps" test.
- Camera framing tuned after looking at screenshots: distance 4.2 m, shoulder 1.05 m, pivot 0.95 m above the capsule center, so the character sits left of the crosshair instead of covering it.
- Lighting moved the sun behind the spawn's left shoulder and added a sky dome, bounce light and 2 m flagstones; the first pass left every face toward the camera almost black.
- Added `ctx.snap(entity)` to the game context (not only on `Game`) so systems can teleport without a blended frame.
- The Animator is tested on a real `SkinnedMesh` in `src/engine/animation.test.ts`; the in-game mannequin uses rigid parts on named joints, which goes through the same mixer path.
