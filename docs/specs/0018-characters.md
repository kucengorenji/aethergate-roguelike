# 0018: Player, enemies and bosses modeled, rigged and animated

Status: in-progress
Owner: Mikael (built by a Claude Code character agent with headless Blender, in a Herdr pane)

## Problem

The player is an early low-poly sorcerer, and every enemy and boss is a graybox figure posed in code (`src/game/systems/enemy-pose.ts`).
M6 Wave 1 replaces them with models that match the approved turnaround sheets, animated so every attack reads before it lands.

## Behavior

- **Player:** `assets-src/player/build_player.py` is updated to the sorcerer turnaround: deeper violet robe with a tattered zig-zag hem, gold sash and trim, a hood with a dark void for a face, dark gloves, the twisted forked staff with the pale blue crystal.
  The rig, the existing clips (`idle`, `run`, `dodge`, layers `aim`, `bash`, `drink`) and their tuned timings keep working; `hit` and `death` clips are added.
- **Hollow Soldier, Thorn Caster, Ward Knight, Ward Captain, Starfallen Knight:** humanoid models on the reduced UAL skeleton (ADR 0003), each from its turnaround sheet and the per-character notes in `docs/design/style-guide.md` (for example the Ward Knight's armor desaturated toward stone, so the Ward Captain stays the one gilded figure).
  The Starfallen Knight is about twice the player's height.
- **Rot Hound:** its own small quadruped rig with keyframed clips written in the script (ADR 0004).
- **Clips for every enemy and boss:** `idle`, `move`, `windup` and `strike` per attack, `hit`, `death` and `spawn` (rising out of ash), plus the bosses' special attacks (the Ward Captain's and the Starfallen Knight's moves in `src/game/ai/`).
  Humanoid clips are retargeted from the UAL library; boss specials are keyframed in the scripts.
- **Readability:** a wind-up shows a clear anticipation pose that holds for the whole wind-up time in `config.ts`, so the player can react; the strike pose lands on the frame the hit lands.
  Gameplay timings in `config.ts` stay the source of truth: clips are retimed to them, never the reverse.
- **Presentation stays deterministic:** the pose of every character is a function of simulation state (state, state time, `ctx.alpha`), never time accumulated per rendered frame, as the player animation already does, so screenshots under `?paused` do not change between runs.
- Eye and gem glows, the hit flash, the status tints and the ground markers keep working on the new models.

## Acceptance criteria

- [ ] One deterministic headless Blender script per character (or one shared builder with a module per character) under `assets-src/`, and one `pnpm` command regenerates every character GLB; the build fails on loose or degenerate geometry, unweighted vertices or a blown budget, like the player build.
- [ ] Every character's triangles and bones are within the style guide budgets, with a line per GLB in `perf-budget.json`; `pnpm perf` passes, including the 40 MB asset budget and the license manifest.
- [ ] In the game, each enemy kind and both bosses use their model and play `spawn`, `idle`, `move`, `windup`, `strike`, `hit` and `death` at the matching AI states (E2E through `inspect()` on the playing clip per state).
- [ ] Wind-up poses last exactly the configured wind-up time and the strike lands with the hit (unit test on the clip timing against `config.ts`).
- [ ] The player model matches its turnaround, its run still plants feet at `config.animation.runClipSpeed`, and `hit` and `death` play at their events.
- [ ] Screenshots of each character in game, front and three-quarter, sit next to its turnaround sheet in the PR and match it in silhouette and color.
- [ ] `pnpm verify` passes, with visual baselines re-recorded on purpose.

## Out of scope

- Environment, doors, rewards and stations (spec 0017), VFX (spec 0014), HUD (spec 0015), audio (spec 0016).
- New enemy behaviors or attack timing changes.
- Cloth or hair simulation.

## Open questions

- Whether the four humanoid enemies share one rig with per-character proportions or each gets its own bone lengths; the plan decides after building the Hollow Soldier first.
