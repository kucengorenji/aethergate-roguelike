# 0009: Asset pipeline spike (rigged player)

Status: done
Owner: Mikael (built by a parallel agent in a Herdr pane)

## Problem

Character animation is the biggest risk in `docs/milestones.md`, and so far the player is a procedural mannequin.
Before M6 we need proof that a rigged, animated low-poly character can go from a Blender script into the game through our Animator, with our quality gate green.

## Behavior

1. The player is a stylized low-poly hooded sorcerer with a staff, built by a headless Blender script committed in `assets-src/` (the script is the source of truth; the `.blend`, if any, is derived).
2. It uses the same art direction as the graybox: flat-shaded, vertex colors or one small palette texture, robe and hood colors from `src/game/config.ts`, a glowing staff gem.
3. Animations come from the Quaternius Universal Animation Library (CC0), retargeted in Blender to the character's rig: at least idle, run (forward; backward may reuse run at negative speed), a dodge roll, and poses or clips for aiming, a staff swing and drinking.
4. The game loads the optimized `.glb` (via `pnpm assets`) before the first frame and plays it through `src/engine/animation.ts`. Clip names stay `idle`, `run`, `dodge`; layers stay `aim`, `bash`, `drink`, so game systems and tests do not change meaning.
5. `?model=mannequin` keeps the procedural mannequin as a fallback while the spike is evaluated.

## Acceptance criteria

- [x] One command regenerates the character from source (for example `pnpm assets:player`), headless, deterministic, documented in `assets-src/README.md`.
- [x] Budget: at most 4,000 triangles, at most 40 bones, `.glb` at most 600 KB after `pnpm assets`.
- [x] Idle, run, dodge, aim, bash and drink all play in game and look right in screenshots from the shoulder camera (no broken skinning, no foot sliding worse than the mannequin, staff stays in the hand).
- [x] The source, license (CC0) and download location of the animation library are recorded in an ADR (`docs/decisions/0003-asset-pipeline.md`).
- [x] Existing tests keep passing; visual baselines change only because of the new character, and each changed image was reviewed.
- [x] Simulation step stays within the CPU budget; bundle and asset size stay within `perf-budget.json`.
- [x] `pnpm verify` passes.

## Out of scope

- Enemies, bosses and environment art (M6).
- Final character design; this is a pipeline proof with a presentable character.

## Open questions

- If the Quaternius library cannot be downloaded without a browser or login, stop and report instead of substituting a different source.
