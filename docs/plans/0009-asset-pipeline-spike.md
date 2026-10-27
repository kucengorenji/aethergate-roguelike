# 0009: Asset pipeline spike (plan)

Spec: docs/specs/0009-asset-pipeline-spike.md

## Approach

- **Animation source.** The Quaternius Universal Animation Library, Standard edition (CC0), as published by the author on OpenGameArt.
  The official site links to itch.io, whose free download needs a browser flow, so the build fetches the author's OpenGameArt upload of the same zip and pins its SHA-256.
  Source, license and hash go into ADR 0003.
- **One command.** `pnpm assets:player` runs `scripts/build-player.mjs`: download the zip into a cache directory (or reuse it), verify the hash, run `assets-src/player/build_player.py` in headless Blender, then run `pnpm assets`.
  The Blender script reads the library's Godot `.glb` straight from the zip, so nothing is extracted next to code.
  Blender's output `assets-src/models/player.glb` is derived and ignored by git; the optimized `public/assets/models/player.glb` is committed so the game builds without Blender.
- **Rig.** The library's humanoid skeleton without the 30 finger bones: 23 bones with short readable names (`hips`, `spine1`, `upperArmR`, ...).
  The explicit name map in the script is the retarget map.
  Because the rest pose is the library's T-pose, retargeting is a per-frame bake of each bone's local rotation; a rig with different proportions later only needs a world-space bake in the same place.
- **Character.** Built from `bmesh` primitives in the T-pose: head, hood with a face opening, shoulder mantle, torso, flared robe, sash, sleeves with wide cuffs, fists, trousers and boots, and a staff with a glowing gem gripped in the right fist.
  Skin weights are computed per part from the distance to a short list of allowed bones, so they are deterministic and editable as data.
  Faces are flat-shaded, and each part uses one of six named materials (`robe`, `hood`, `skin`, `accent`, `staff`, `gem`).
  The game swaps them for shared materials colored from `config.colors`, so the palette stays in `config.ts` and the debug panel.
- **Clips.** Baked at 30 fps from library clips, with the root bone locked so the physics body owns all motion:
  - `idle` from `Idle_Loop`.
  - `run` from `Jog_Fwd_Loop`, retimed so the planted foot moves at 5.5 m/s (`config.animation.runClipSpeed`). The script measures the speed and fails if it is off.
  - `dodge` from the dive-and-roll part of `Roll`.
  - Layers `aim` (from `Pistol_Aim_Neutral` with the wrist turned so the staff points ahead), `bash` (the swing of `Sword_Attack`) and `drink` (the hand-to-face part of `Pistol_Reload`, mirrored to the left hand).
    Layers key the upper body only; the lower body holds the idle pose, and each layer starts and ends on the idle pose so it never pops.
- **Game side.** `createGame` awaits the model before spawning the player, so the first frame and every test see it.
  A new `entities/player-model.ts` returns `{ root, clips, layers }` like `createMannequin`.
  It fits `dodge`, `bash` and `drink` to their durations in `config.ts` and turns the layers into additive clips relative to the first idle frame (`AnimationUtils.makeClipAdditive`), which is what `Animator` expects.
  `?model=mannequin` keeps the procedural figure.
- **Budgets.** `perf-budget.json` gains an `assets` section (player: 4,000 triangles, 40 bones, 600 KB), checked by `scripts/check-asset-budget.mjs` in `pnpm perf`.
- **Optimizer.** `pnpm assets` passes `--palette false`, because merging the named materials into a palette texture would lose the names the game maps to config colors.

## Changes

| File                                     | Change                                                       |
| ---------------------------------------- | ------------------------------------------------------------ |
| `assets-src/player/build_player.py`      | Blender script: rig, mesh, weights, clip bake, export        |
| `assets-src/README.md`                   | How to regenerate, inputs, determinism, budgets              |
| `scripts/build-player.mjs`               | Fetch and verify the library, run Blender, run `pnpm assets` |
| `scripts/optimize-assets.mjs`            | `--palette false`                                            |
| `scripts/check-asset-budget.mjs`         | Triangles, bones and size per model from `perf-budget.json`  |
| `package.json`, `perf-budget.json`       | `assets:player`; asset budget in `pnpm perf`                 |
| `public/assets/models/player.glb`        | Generated, optimized character                               |
| `src/game/entities/player-model.ts`      | Load, material swap, clip fitting, additive layers           |
| `src/game/entities/player.ts`            | Take the model as an argument                                |
| `src/game/index.ts`                      | `?model=` switch, load before spawning                       |
| `docs/decisions/0003-asset-pipeline.md`  | ADR: source, license, download location, rig and clip choice |
| `AGENTS.md`, `docs/architecture.md`      | `?model=`, `pnpm assets:player`, asset section               |
| `tests/e2e/character.spec.ts`            | Model loaded, clips and layers play, mannequin fallback      |
| `tests/e2e/visual.spec.ts` and baselines | New shoulder-camera poses; re-recorded baselines             |

## Tests

| Acceptance criterion       | Test                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------- |
| One command, deterministic | Run `pnpm assets:player` twice and compare hashes (manual, documented)             |
| Budget                     | `scripts/check-asset-budget.mjs` in `pnpm perf`                                    |
| Clips play and look right  | `character.spec.ts` (clip and layer weights) plus shoulder-camera visual baselines |
| ADR                        | `docs/decisions/0003-asset-pipeline.md`                                            |
| Existing tests             | Full `pnpm e2e`; baselines reviewed one by one                                     |
| CPU and size budgets       | `pnpm perf`                                                                        |
| Fallback                   | `character.spec.ts` › mannequin fallback                                           |

## Risks

- Skinning cost on the simulation step: the Animator runs in the fixed step; 23 bones is cheap, measured by the perf test.
- A staff rigidly bound to the hand follows each library clip's wrist, which can point it into the body or the floor; aim and run need checking from the shoulder camera.
- Library clips start from different stances, so layer deltas are taken against the first idle frame; layers over `run` may look stiffer than over `idle`.
- Meshopt quantization of a skinned mesh must keep the bind pose intact; checked in screenshots.
- Visual baselines with the player in view all change.

## Changes during the build

- The library's clips are imported at the scene rate (30 fps), so the script converts the library's 24 fps frame numbers in one place (`sample_library`).
- `run`: the jog counter-rotates the chest by about 36 degrees, which swung the held staff from side to side. The staff arm keeps most of the idle carry, the chest twist is halved, and the wrist keeps the staff pointing along the carry direction.
- `bmesh.ops.solidify` left zero-area rims on open shells, so the script has its own `shell` helper; the census caught it.
- The existing visual baselines stayed within the 1% pixel tolerance with the new character, so they were re-recorded with `--update-snapshots=all` to show it, and three poses were added (dodge, bash, drink).
- `playwright.config.ts` reads `E2E_PORT`, because a parallel checkout on the same machine would otherwise reuse the other checkout's preview server on port 4173.
