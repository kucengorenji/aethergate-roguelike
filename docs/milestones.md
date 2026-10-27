# Milestones

Plan for a solo developer working with AI agents.
The MVP is 6 to 8 weeks.
Each milestone ends with a playable build, `pnpm verify` green, and an exit check that someone can actually play.
Graybox comes first, art comes last, so the fun is proven before effort goes into assets.
Each milestone is broken into specs in `docs/specs/` when it starts, following `docs/workflows/sdlc.md`.

See `docs/design/game-design.md` for the design itself.

This file is the source of truth for progress, and the dashboard (`pnpm progress`) is generated from it.
Task markers: `[x]` done, `[~]` in progress, `[ ]` not started.
Mention a spec as `spec 0002` in a task and the dashboard links them.
A milestone is done only when every task and its exit check are `[x]`.
See `docs/workflows/progress.md` for how and when to update it.

## M0: Project setup

Weeks: day 0

- [x] Repo created from the starter, renamed to Aethergate, `pnpm install` and git hooks working.
- [x] Game design, milestones and ADR 0002 written from the grilling session.
- [x] Playwright system dependencies installed on WSL, visual baselines recorded.
- [x] Progress tracking: milestone checkboxes, progress log, generated dashboard, progress skill.
- [x] Initial commit on `main`.
- [x] **Exit:** `pnpm verify` is green and the dashboard shows the real state of the project.

## M1: Engine foundations and a TPS graybox

Weeks: 1

The starter has no mouse input, no animation and no audio, and a TPS needs all three.

- [x] Mouse input in the engine: pointer lock, mouse delta per fixed step, buttons with edges.
- [x] Render interpolation between fixed steps, so the camera does not judder on 120 Hz and 144 Hz screens.
- [x] Kinematic character controller (Rapier) with walk and collision.
- [x] Over-the-shoulder camera with wall collision push-in and a crosshair.
- [x] Skinned animation support in the engine (AnimationMixer as a frame system, driven by gameplay state).
- [x] Minimal audio module (Web Audio: one-shot SFX, looping music, master volume).
- [x] One graybox arena with cover, replacing the gem demo (spec 0001 marked superseded, spec 0002).
- [x] **Exit:** walk around the graybox with a mouse-aimed camera at a smooth 60 fps, and the gem demo is gone.

## M2: Combat core

Weeks: 2

- [x] Pooled projectiles and the primary staff spell with focus (mana) (spec 0003).
- [x] Dodge roll with i-frames, emergency melee bash.
- [x] Hitbox and hurtbox model, health, damage, death.
- [x] Hit feedback: hitstop, flash, damage numbers, camera kick, placeholder SFX.
- [x] A training dummy, and a HUD with HP, focus and flask.
- [x] **Exit:** shooting the dummy feels satisfying for 2 minutes with graybox art and no enemies.

## M3: Enemies and combat rooms

Weeks: 3

- [x] AI state machine with steering and separation, attack telegraphs (spec 0004).
- [x] Hollow Soldier, Thorn Caster, Ward Knight, Rot Hound.
- [x] Wave spawner and a room clear condition.
- [x] Player death and a restart.
- [x] **Exit:** a single arena with 3 waves is tense, readable and fair.

## M4: Run structure and boons

Weeks: 4-5

Target: one seeded run from the first room to the boss in 15 to 20 minutes, where two runs with different boons play noticeably differently.
Execution order (decided 2026-10-27): spec 0005 run structure, then 0006 Ash skill, then 0007 boons, then 0008 bosses; the asset spike (0009) runs in parallel after 0005.

- [x] Run structure: about 6 handcrafted arena layouts, 8 rooms per run (5 combat, 2 reward, mini-boss around room 5, boss in room 8), two doors per cleared room showing their reward, seeded so `?seed=` reproduces a run (spec 0005).
- [ ] Ash skill on right click with a cooldown: one default skill and four boon variants (spec 0006).
- [ ] Boon system: four demigods with four blessings each (primary, skill, dodge, passive) plus 2 duo blessings, pick 1 of 3, status effects Chill, Crush, Rot and Chain (spec 0007).
- [ ] Mini-boss (elite, 2 phases) and the boss, the Starfallen Knight (gravity theme: pull, telegraphed meteors, shrinking arena in phase 3), with a boss health bar (spec 0008).
- [ ] Asset pipeline spike: a rigged low-poly player built by a headless Blender script in `assets-src/`, animations retargeted from the Quaternius Universal Animation Library (CC0), loaded through the Animator in place of the mannequin (spec 0009).
- [ ] An E2E test plays one full seeded run from the first room to the boss through the test hook.
- [ ] **Exit:** a full run from start to boss, and two runs with different boons play noticeably differently.

## M5: Hub and meta progression

Weeks: 5-6

- [ ] Death and victory return to the hub.
- [ ] Lumen shards currency, about 6 permanent upgrades, two staff variants to unlock.
- [ ] Local save (IndexedDB) with versioning.
- [ ] Main menu, pause menu, settings (mouse sensitivity, volume, quality).
- [ ] **Exit:** a player keeps coming back for "one more run" because the next unlock is in sight.

## M6: Art and audio pass

Weeks: 6-7

Can start in parallel from M3 onward, since it only swaps assets.

- [ ] Player and 4 enemies modeled, rigged and animated (retargeted library clips plus custom cast poses).
- [ ] Biome kit: ruined walls, pillars, golden tree roots, graves, fog cards.
- [ ] Lighting, fog, bloom, ash particles, spell VFX.
- [ ] Final SFX and one ambient music track.
- [ ] A visual style guide in `docs/design/` so assets stay consistent.
- [ ] **Exit:** a screenshot of any room looks like a game, not a prototype.

## M7: Performance, polish and playtest

Weeks: 7-8

- [ ] Profile on the target iGPU, dynamic render scale, quality presets.
- [ ] Perf budgets for 30 enemies and 200 projectiles in `pnpm perf`.
- [ ] Bug bash, onboarding (the first room teaches the controls), balance pass.
- [ ] At least 3 external playtesters, findings recorded and triaged.
- [ ] A build on itch.io (browser).
- [ ] **Exit:** a stranger finishes or fails a run without help, and wants to play again.

## Main risks

| Risk                                                | Mitigation                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| Character animation takes much longer than expected | Library clips plus retargeting, robed silhouettes, start in M1     |
| TPS feel (camera and aim) is off                    | Prove it in M1 and M2 with graybox before any content              |
| iGPU performance                                    | Budgets enforced from M2 onward, instancing and pooling by default |
| Scope creep (jump, gamepad, biome 2)                | Post-MVP backlog in the design doc, not in milestones              |
| Browser quirks (pointer lock, tab throttling)       | E2E tests through the paused test hook, not wall-clock time        |
