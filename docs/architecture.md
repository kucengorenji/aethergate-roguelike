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
For large binary assets in a team repo, consider Git LFS (`git lfs track "*.glb"`).
