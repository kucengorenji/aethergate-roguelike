# 0003: Combat core (plan)

Spec: docs/specs/0003-combat-core.md

## Approach

- **Projectiles are a pooled struct-of-arrays, not ECS entities.** Up to 256 live bolts and orbs in typed arrays, drawn with one `InstancedMesh` per kind (one draw call each). Each step a projectile moves from its previous to its new position; that segment is ray cast against level geometry (walls) and tested analytically against hurtboxes (vertical capsules), which is cheap for 200 projectiles times 30 targets.
- **Aim** goes through the crosshair: the camera rig math is a pure function shared by the camera frame system and the cast system, so the fixed step computes the same camera ray the player sees (minus not-yet-consumed mouse movement). The aim point is the first hit along that ray, and bolts fly from the staff tip toward it.
- **Hitstop** is an engine-level `ctx.timeScale`: fixed systems, physics and animators advance by `stepSeconds * timeScale`. A hit sets a few steps of near-zero time scale. Input still counts per step, so the game stays responsive and deterministic.
- **Action state** is one `action` component on the player (`none | dodge | bash | drink` with a timer), so the rules "no casting while rolling or drinking" live in one place.
- **Feedback** (hit flash, damage numbers, camera kick and shake, screen-edge flash) is data on entities and state written by fixed systems and read by frame systems.
- **Upper-body poses** (aiming, bashing, drinking) are applied by a frame system after the animator, so the run cycle keeps the legs moving.

## Changes

| File                                                                      | Change                                                                       |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/engine/game.ts`                                                      | `ctx.timeScale`                                                              |
| `src/game/config.ts`                                                      | Spell, focus, dodge, bash, flask, dummy, totem, feedback tunables            |
| `src/game/components.ts`, `state.ts`                                      | health, hurtbox, caster, action, flask, dummy, totem, flash; phase, feedback |
| `src/game/combat/projectiles.ts`                                          | New: pool, spawn, free, kinds                                                |
| `src/game/combat/hit.ts`                                                  | New: segment versus capsule test                                             |
| `src/game/combat/camera-rig.ts`                                           | New: shared camera math; `tps-camera.ts` uses it                             |
| `src/game/combat/damage.ts`                                               | New: apply damage with i-frames, flash, numbers, hitstop                     |
| `src/game/entities/dummy.ts`, `totem.ts`, `mannequin.ts`                  | Dummy, totem, staff on the mannequin, dodge clip                             |
| `src/game/systems/cast.ts`, `focus.ts`, `dodge.ts`, `bash.ts`, `flask.ts` | Player verbs                                                                 |
| `src/game/systems/projectiles.ts`                                         | Move, collide, expire, impacts                                               |
| `src/game/systems/totem.ts`, `dummy.ts`, `death.ts`, `feedback.ts`        | Totem firing, dummy respawn, player death, hitstop and kick decay            |
| `src/game/systems/projectile-render.ts`, `pose.ts`, `damage-numbers.ts`   | Frame systems                                                                |
| `src/game/ui/hud.ts`, `index.html`, `style.css`                           | Health, focus, flasks, death banner, damage numbers, hurt vignette           |
| `tests/e2e/combat.spec.ts`, `visual.spec.ts`, `perf.spec.ts`              | Combat tests, baselines, 200-projectile perf case                            |

Fixed order: restart, look, action input (dodge, bash, flask), locomotion, cast, focus, totem, projectiles, dummy, death, feedback, player animation, footsteps, timer.
Frame order: projectile render, player facing, pose, camera, damage numbers, HUD.

## Tests

| Acceptance criterion        | Test                                                        |
| --------------------------- | ----------------------------------------------------------- |
| Fire rate and cost          | `combat.spec.ts` › "holding fire casts five bolts a second" |
| Bolt hits dummy             | `combat.spec.ts` › "bolts damage the dummy"                 |
| Walls stop bolts            | `combat.spec.ts` › "cover blocks bolts"                     |
| Empty focus                 | `combat.spec.ts` › "no focus, no bolt"                      |
| Focus regen                 | `combat.spec.ts` › "focus regenerates after a pause"        |
| Dodge distance and i-frames | `combat.spec.ts` › "dodge moves and avoids damage"          |
| Dodge cooldown              | `combat.spec.ts` › "dodge has a cooldown"                   |
| Bash                        | `combat.spec.ts` › "bash hits in front only"                |
| Flask                       | `combat.spec.ts` › "flask heals and runs out"               |
| Hitstop                     | `combat.spec.ts` › "hits cause hitstop"                     |
| Dummy respawn               | `combat.spec.ts` › "dummy collapses and returns"            |
| Death and restart           | `combat.spec.ts` › "totem orbs can kill, R restores"        |
| Unit                        | `projectiles.test.ts`, `hit.test.ts`, `camera-rig.test.ts`  |
| Perf                        | `perf.spec.ts` › "200 projectiles stay within budget"       |
| Visual                      | `visual.spec.ts` › "casting at the dummy"                   |

## Risks

- Hitstop and fixed-step timing: time scale must not leak into input edges or the step counter.
- Fast bolts (40 m/s, 0.67 m per step) need swept tests, which the segment approach gives.
- DOM damage numbers: pool a fixed number of elements to avoid layout churn.

## Changes during build

- Holding fire with too little focus now resets the regen delay. The "no focus, no bolt" test showed that regen otherwise refilled one cast every 0.19 s, so holding the button kept firing at nearly the full rate.
- `interactionGroups` moved to `src/engine/collision-groups.ts`, because pure modules importing it through `physics.ts` loaded the Rapier wasm and broke unit tests in Node.
- Bolts are drawn at twice their hit radius and a more saturated blue. At the original size they nearly vanished against the beige graybox.
- Hitstop also slows the cast cooldown, so a burst that keeps hitting fires slightly slower than 5 per second. Intended: hits should feel heavy.
- The entry bundle grew to 20.8 of 25 KB. M3 will likely need to move game code into its own lazily loaded chunk or justify a budget change.
