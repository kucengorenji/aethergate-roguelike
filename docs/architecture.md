# Architecture

## Layers

```
src/
  main.ts            entry: reads URL params, creates the game, shows fatal errors
  engine/            reusable, game-agnostic (must not import game/)
    game.ts          Game: renderer, scene, camera, ECS world, physics, input, loop
    fixed-step.ts    fixed-timestep accumulator
    physics.ts       Rapier world wrapper, ray casts, debug wireframe
    renderer.ts      WebGPURenderer with WebGL 2 fallback
    input.ts         keyboard, mouse buttons, pointer lock, mouse look per step
    interpolation.ts blends bodies between the last two steps when rendering
    animation.ts     Animator: named clips with cross-fades (fixed-step updated)
    audio.ts         Web Audio: one-shot sounds, music loop, master volume
    synth.ts         procedural placeholder sounds
    rng.ts           seeded random numbers
    assets.ts        glTF loading (meshopt) with cache
    params.ts        URL parameters
    test-hook.ts     window.__game contract for tests and agents
    debug/overlay.ts stats-gl, lil-gui, physics wireframe (lazy-loaded)
  game/              Aethergate
    index.ts         composition root: spawn entities, register systems, debug panel, test hook
    arenas/          handcrafted arena layouts as data
    config.ts        tunables
    components.ts    Entity type (all components)
    state.ts         non-entity game state
    entities/        factories that build bodies and meshes and add entities
    systems/         one file per system
    ui/              DOM HUD
```

## Frame loop

Each animation frame:

1. The fixed-step accumulator decides how many 1/60 s steps to run (at most 5 after a stall).
2. For each step: consume mouse look, run fixed systems in registration order, step physics, advance animators, capture body transforms, clear input edges.
3. Blend each body's `object3d` between the last two captured steps by `alpha` (the leftover fraction of a step; 1 while paused).
4. Run frame systems once (camera, model facing, HUD).
5. Render.

Because `object3d` holds the blended, rendered transform, fixed systems read positions from `body`, never from `object3d`.
Frame systems are pure functions of simulation state, `alpha` and not-yet-consumed mouse movement (`input.pendingLook`), and never change gameplay state.
That keeps paused screenshots deterministic while the camera responds to the mouse without a step of latency.
After a teleport, call `ctx.snap(entity)` so the next frame does not blend from the old position.

Gameplay is fully determined by the seed, the inputs and the step count.
That is why Playwright can pause the game, press keys, call `advance(n)` and expect the exact same result on every machine.
A test session opened with `?paused` renders only when the test hook asks for a frame (`advance`, `nextFrame`), because headless browsers render in software and a frame takes long enough to stall every test round trip.

## ECS in practice

- An entity is a plain object: `{ player: true, body, object3d }`.
- Query with `world.with('player', 'body')`. Queries are cached and update when entities are added or removed.
- Add or remove components with `world.addComponent(entity, 'name', value)` and `world.removeComponent(entity, 'name')` so queries stay correct. Don't just assign or delete properties.
- Removing an entity removes its mesh from the scene and its body from physics automatically.
- An `animator` component (`src/engine/animation.ts`) is advanced by the engine every fixed step. Game systems only decide which clip plays.

## Input and pointer lock

Clicking the canvas requests pointer lock; Esc releases it.
Mouse movement and mouse buttons only count while locked, so the click that locks never fires a spell.
`input.look` holds the mouse movement for the current fixed step; buttons are `Mouse0` (left) and `Mouse2` (right) in `isDown` and `wasPressed`.
Tests cannot rely on real pointer lock, so the test hook has built-in actions: `act('pointerLock', 1)` and `act('look', dx, dy)`.

## Time scale and hitstop

`ctx.timeScale` multiplies the simulated time of a fixed step (systems, physics, animators).
Hitstop sets it near zero for a few steps after a hit; step count, ticks and input edges are unaffected, so tests stay deterministic.
Effects that should keep running during hitstop (camera shake, flashes, damage numbers) decay with the real step time instead of `ctx.dt`.

## Projectiles and hits

Projectiles live in a pooled struct-of-arrays (`src/game/combat/projectiles.ts`), not in the ECS, and render with one instanced mesh per kind.
Each step a projectile sweeps from its previous to its new position: a ray against level geometry and a swept sphere-versus-capsule test against hurtboxes.
Actor colliders (player, dummy, later enemies) use the `ACTOR_GROUPS` collision group, and level rays use `WORLD_RAYS`, so the camera and projectiles ignore actors' physics shapes and hit them through hurtboxes instead.
Crosshair aim and the camera share one pure function (`cameraRig`), so bolts go exactly where the crosshair points.

## Enemies

Each enemy has one `enemy` component with its kind, AI state and timers.
The decision logic is a pure function (`src/game/ai/brains.ts`) from a small view of the world to the next state and a desired velocity, so it is unit-tested without Rapier.
Systems run it (`enemy-ai`), move enemies through one shared character controller with separation steering (`enemy-motion`), resolve attacks (`enemy-attack`) and remove the dead (`enemy-death`); a frame system presents poses, glows and ground markers from the state (`enemy-pose`).
Enemies collide with the level and the player but not with each other (`ENEMY_GROUPS`), because overlapping capsules lock the character controller.

## Runs and rooms

A run is pure data from the seed (`src/game/run/plan.ts`): 8 rooms with layouts and waves, and the door offers between them.
The environment (sky, lights, fog) is built once; each room's geometry, doors and reward token are entities tagged `room`, and `despawnRoom` removes exactly those, including their static bodies.
`systems/run.ts` is the room flow (fighting, reward, choosing, transition, complete) on top of the wave encounter.

## Modes

`?mode=run` (default) plays a full run, `?mode=encounter` is the single three-wave chamber, `?mode=training` is the practice courtyard with the dummy and totem, `?mode=sandbox` is the empty arena for tests that spawn enemies themselves.

## Audio

`ctx.audio` creates its AudioContext on the first click or key press (browser autoplay rules).
Register sounds once in `src/game/index.ts`, from generated samples (`src/engine/synth.ts`) or files under `public/`, then `ctx.audio.play(name, { volume, rate })`.

## Adding a feature (example: a speed boost pad)

1. Component in `components.ts`: `boostPad?: { strength: number }`.
2. Tunable in `config.ts`: `boost: { strength: 8 }`.
3. Factory `entities/boost-pad.ts`: static mesh, `world.add({ boostPad: {...}, object3d })`.
4. System `systems/boost.ts`: for the player near a pad, apply an impulse.
5. Register it in `index.ts` after `playerControlSystem`.
6. Expose what tests need in `inspect()`, then add an E2E test.

## Assets

Put source models in `assets-src/models` and run `pnpm assets`.
Optimized `.glb` files land in `public/assets/models` and load with `loadModel('assets/models/name.glb')`.
The player character is generated by a Blender script (`assets-src/player/build_player.py`, run with `pnpm assets:player`); see `assets-src/README.md` and ADR 0003.
`createGame` awaits the model before spawning the player (`entities/player-model.ts`), so the first frame and every test see it.
The loader swaps the model's named materials for shared materials colored from `config.colors`, fits action clips to the durations in `config.ts`, and makes the upper-body layers additive relative to the first idle frame.
`?model=mannequin` uses the procedural figure (`entities/mannequin.ts`) with the same clip and layer names.
Model budgets (triangles, bones, file size) are in `perf-budget.json` and checked by `pnpm perf`.
For large binary assets in a team repo, consider Git LFS (`git lfs track "*.glb"`).
