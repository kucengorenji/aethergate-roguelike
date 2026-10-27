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
    input.ts         keyboard state and edges
    rng.ts           seeded random numbers
    assets.ts        glTF loading (meshopt) with cache
    params.ts        URL parameters
    test-hook.ts     window.__game contract for tests and agents
    debug/overlay.ts stats-gl, lil-gui, physics wireframe (lazy-loaded)
  game/              the demo; replace with your game
    index.ts         composition root: spawn entities, register systems, debug panel, test hook
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
2. For each step: run fixed systems in registration order, step physics, copy body transforms to meshes, clear input edges.
3. Run frame systems once (presentation only).
4. Render.

Gameplay is fully determined by the seed, the inputs and the step count.
That is why Playwright can pause the game, press keys, call `advance(n)` and expect the exact same result on every machine.

## ECS in practice

- An entity is a plain object: `{ player: true, body, object3d }`.
- Query with `world.with('gem', 'object3d')`. Queries are cached and update when entities are added or removed.
- Add or remove components with `world.addComponent(entity, 'name', value)` and `world.removeComponent(entity, 'name')` so queries stay correct. Don't just assign or delete properties.
- Removing an entity removes its mesh from the scene and its body from physics automatically.

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
