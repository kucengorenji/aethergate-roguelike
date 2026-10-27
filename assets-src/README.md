# Asset sources

Everything here is source: scripts and hand-made models.
Optimized runtime files land in `public/assets/models` and are what the game loads.

## Models (`models/`)

Drop `.glb` or `.gltf` files into `models/` and run `pnpm assets`.
It optimizes each one (dedupe, prune, weld, meshopt compression, WebP textures) into `public/assets/models`.
Materials are kept by name (no palette merging), because the game swaps named materials for colors from `src/game/config.ts`.

## The player character (`player/`)

`player/build_player.py` is the source of truth for the player: a low-poly hooded sorcerer with a staff, rigged on a reduced Quaternius Universal Animation Library skeleton, with clips baked from that library.
Source, license and the reasons behind the pipeline are in `docs/decisions/0003-asset-pipeline.md`.

Regenerate it with one command:

```sh
pnpm assets:player
```

It needs Blender 5.2 (`blender` on the `PATH`, or set `BLENDER=/path/to/blender`) and network access the first time.
The command:

1. Downloads the library's Standard zip into `~/.cache/aethergate/` (or uses `UAL_ZIP=/path/to/zip`) and checks its pinned SHA-256.
2. Runs the script headless: `blender --background --factory-startup --python-exit-code 1 --python assets-src/player/build_player.py -- --library <zip> --out assets-src/models/player.glb`.
3. Runs `pnpm assets`, which writes `public/assets/models/player.glb`.
4. Checks the triangle, bone and size budget in `perf-budget.json`.

`assets-src/models/player.glb` is derived and ignored by git; commit `public/assets/models/player.glb`.
The build is deterministic: the same library, script and Blender version give byte-identical files.

### What the script does

- **Rig**: imports the library's Godot `.glb` from the zip, then builds a 23-bone rig from its skeleton without finger bones (`BONES` maps our names to the library's).
- **Mesh**: lofts each part (head, hood, mantle, torso, robe, sash, legs and boots, sleeves and fists, staff and gem) from rings in the T-pose, flat-shaded, with six named materials.
- **Weights**: computed per part from the distance to the bones that part may follow (`part_weights`).
- **Clips**: samples library clips into `idle`, `run`, `dodge` and the additive layers `aim`, `bash`, `drink` (`bake_clips`). The run is retimed so a planted foot moves at 5.5 m/s, matching `config.animation.runClipSpeed`, and the build fails if it does not.
- **Checks**: fails on loose vertices, degenerate faces, unweighted vertices or a blown budget, and prints a `PLAYER_REPORT` line with counts, the measured run speed and the gem position in the aim pose.
- **Export**: glTF binary, facing -Z with the origin at the feet, every bone keyed in every clip.

Tunables (staff length, aim pose, how much the staff arm swings while running) are in the `P` table at the top of the script.
To check a change, run `pnpm assets:player`, then look at the character in game (`pnpm dev`) or in the visual tests (`tests/e2e/visual.spec.ts`).
The game fits `dodge`, `bash` and `drink` to the durations in `config.ts` and turns the layers into additive clips relative to the first idle frame (`src/game/entities/player-model.ts`).
