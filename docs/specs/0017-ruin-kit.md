# 0017: Ruin kit, hall stations, doors and rewards

Status: in-progress
Owner: Mikael (built by a Claude Code environment agent with headless Blender, in a Herdr pane)

## Problem

Every room is drawn with grey boxes (`spawnArena` in `src/game/entities/level.ts`), and the doors, rewards, hall stations and the great tree are graybox shapes.
M6 Wave 1 replaces them with the modular ruin kit from the approved concept, without changing how the game plays.

## Behavior

The player sees ruined courtyards of faceted pale stone instead of boxes; every collider, path and sightline stays exactly where it was.

- **Walls** (`kind: 'wall'`): built from 2 m and 4 m wall segments, ends and corners, stretched slightly to fill each box exactly; the top edge breaks in stepped chunks on some segments, chosen by a seed from the layout so a layout always looks the same.
- **Pillars** (`kind: 'pillar'`): whole pillars at full height, broken pillars where the box is shorter, with a base and a capital; a broken one may leave a fallen drum nearby as dressing.
- **Cover** (`kind: 'cover'`): low broken wall chunks, rubble blocks and fallen drums that match the box's footprint and height.
- **Trim** (`kind: 'trim'`): lintels, ledges, steps and plinths.
- **Floor:** 2 m flagstone tiles in two or three variants with gold inlay lines on some, one ring tile at a room's center where it fits.
- **Dressing** (no colliders): graves, tree roots, rubble piles, fallen drums and braziers with a small golden flame (never orange-red, style guide), scattered by a seeded rule that keeps clear of colliders, spawn points, doors and the player's paths.
- **Doors:** the door arch with a golden glow inside replaces the graybox door in `src/game/entities/door.ts`; the reward emblem above it keeps working.
- **Rewards:** the blessing orb, the shard cluster and the heal flask replace the graybox pickups in `src/game/entities/pickup.ts`, keeping their float and spin.
- **Kindled Hall:** the grace site (golden sapling on a stone ring), the altar with its floating pale blue crystal and the staff rack with three staffs replace `src/game/entities/station.ts`'s shapes, and the hall gets a small broken wall with a window arch.
- **The great tree:** a low mesh (or camera-facing cards) that reads as the glowing tree of the hall sheet on the horizon, replacing the cylinder and icosahedron in `level.ts`.
  A generated concept image may be shipped as a backdrop texture only with a `LICENSES.md` line marking it shipped.

Everything follows `docs/design/style-guide.md`: faceted shapes, vertex-color gradients over named materials recolored from `config.colors`, the triangle budgets per class, and emissive only where the color language allows.

## Acceptance criteria

- [ ] A deterministic headless Blender script under `assets-src/` builds every kit piece, station, door, reward and the tree into GLB files, and a `pnpm` script regenerates them in one command (like `pnpm assets:player`).
- [ ] Every combat room layout, the boss arena and the Kindled Hall draw from the kit, and no graybox box remains visible in any of them.
- [ ] Colliders, spawn points and doors are unchanged: every existing gameplay E2E test passes without edits to its expectations.
- [ ] The same seed and layout always produce the same dressing (unit test on the placement function); dressing never overlaps a collider, a spawn point, a door or the reward point (unit test over every layout).
- [ ] Each GLB has a budget line in `perf-budget.json`, and `pnpm perf` passes, including the 40 MB asset budget and the license manifest.
- [ ] A combat room stays within the draw-call and frame budget in the debug overlay at High and Low quality on this machine (numbers recorded in the PR); Low quality thins the dressing.
- [ ] Visual baselines are re-recorded on purpose, and screenshots of the hall, two combat rooms and the boss arena look like the concept frames' world, not a prototype.
- [ ] `pnpm verify` passes.

## Out of scope

- Characters and their animation (spec 0018), VFX and post-processing (spec 0014), the HUD (spec 0015), audio (spec 0016).
- Per-room lighting, fog and post settings (M6 Wave 2).
- New layouts or changes to collision.

## Open questions

- Whether instancing or merged static meshes per room gives fewer draw calls on this machine; the plan measures both on one room before choosing.
