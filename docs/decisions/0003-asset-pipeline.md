# ADR 0003: Character asset pipeline (Blender script plus a CC0 animation library)

Status: accepted
Date: 2026-10-27

## Context

Character animation is the biggest risk in the milestones (see ADR 0002: stylized low-poly made in Blender, animations retargeted from a free library).
Spec 0009 asks for proof that a rigged, animated character can go from a Blender script into the game through our `Animator`, with the quality gate green.
Agents build the game, so every asset step must run headless, be reviewable as text and give the same result every time.

## Decision

- **Animation source: Quaternius Universal Animation Library, Standard edition.**
  - Author: Quaternius (https://quaternius.com/packs/universalanimationlibrary.html).
  - License: CC0 1.0 Universal (public domain dedication), stated on the author's page and in `License.txt` inside the zip. No attribution is required; we credit the author here anyway.
  - Download location used by the build: https://opengameart.org/sites/default/files/universal_animation_librarystandard.zip, from the author's own OpenGameArt entry https://opengameart.org/content/universal-animation-library (posted by `quaternius`, CC0).
  - The author's site links to itch.io (https://quaternius.itch.io/universal-animation-library), where the free Standard zip is pay-what-you-want. Its "No thanks, just take me to the downloads" step is a browser flow that a plain HTTP client does not get through, so the build uses the author's OpenGameArt upload of the same Standard edition instead. It is the same library from the same author, not a substitute.
  - Pinned by SHA-256 `18ff1a7215f4852b320203e8aaf02a1578b5c8eef9027fbaedfcedc7b85a3ac2` (14,541,205 bytes). The build refuses any other file.
  - The zip is third-party data: it is downloaded to `~/.cache/aethergate/`, never committed, and the Blender script reads the Godot `.glb` straight out of it.
- **The Blender Python script is the source of truth.** `assets-src/player/build_player.py` builds the mesh, rig, skin weights and clips; `pnpm assets:player` runs it with Blender 5.2 and then `pnpm assets`. Only the optimized `public/assets/models/player.glb` is committed, so the game builds without Blender.
- **Rig: the library skeleton without fingers.** 23 of the library's 53 bones, renamed (`DEF-upper_arm.R` becomes `upperArmR`). The fists hold no finger bones. The name table in the script is the retarget map. Because our rig keeps the library's rest pose, retargeting is a bake of each bone's local rotation per frame.
- **Clips are baked, not referenced.** Each game clip is sampled from a library clip at 30 fps, with the root bone locked so the physics body owns all motion: `idle` from `Idle_Loop`, `run` from `Jog_Fwd_Loop`, `dodge` from the first part of `Roll`, and the additive layers `aim` (from `Pistol_Aim_Neutral`), `bash` (from `Sword_Attack`) and `drink` (from `Pistol_Reload`, mirrored to the left hand). Adjustments are explicit code: the run is retimed so a planted foot moves at the game's run speed, the staff arm keeps a steady carry while running, the aim fist is placed with a two-bone IK, and the layers fade in and out of the idle pose.
- **Colors stay in `config.ts`.** The mesh uses six named materials; the game swaps them for shared materials built from `config.colors`. `pnpm assets` therefore no longer merges materials into a palette texture.
- **Budgets are checked.** `perf-budget.json` holds per-model limits (player: 4,000 triangles, 40 bones, 600 KB), enforced in `pnpm perf`.

## Alternatives considered

- **Mixamo**: large library, but needs an Adobe login and its license does not allow redistributing the raw animations.
- **Hand-keyed clips in the script**: no dependency, but weeks of animation work for results worse than motion-designed clips.
- **The itch.io download via a scripted browser**: possible, but brittle and not needed when the author publishes the same files with a direct link.
- **Retargeting with constraints onto a rig with different proportions**: needed once a character with different proportions arrives; the bake step is the one place that changes.
- **Committing the intermediate `.glb` or a `.blend`**: binary, derived and redundant with the script.

## Consequences

- Regenerating the character needs Blender 5.2 and network access once; everything else (game, tests, CI) only needs the committed `.glb`.
- The build is deterministic: two runs produce byte-identical files (checked while building spec 0009).
- New characters on the same skeleton (enemies in M6) can reuse the rig, the clip baker and the weight rules.
- The Standard edition has no drinking clip; `drink` is adapted from a reload pose. The Pro edition may have better matches, but it is paid.
- A staff bound rigidly to the hand follows each clip's wrist, so poses that hold a weapon need per-clip adjustments in the script.
