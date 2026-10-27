# Progress log

One entry per work step, newest date first, newest entry first within a date.
Format: `- M1: what changed and what it means` under a `## YYYY-MM-DD` heading.
Use `--` instead of a milestone id for work that belongs to no milestone.
See `docs/workflows/progress.md`.

## 2026-10-27

- M3: All M3 tasks built (spec 0004 done): four enemy kinds with telegraphed attacks, knight shields, three waves with a cleared state, training and sandbox modes. Verify green, 70 unit and 44 E2E tests, 30 enemies plus 200 projectiles at 1.19 ms per step. Exit check waits for a playtest.
- M3: Fixed: stacked enemies locked each other in the character controller; enemies now only collide with the level and the player and separate by steering.
- M3: Fixed flaky E2E timeouts at the root: in-page `advanceUntil`, three Playwright workers (CPU-bound software rendering), serial perf tests.
- M3: Started M3 on branch `feat/m3-enemies`, writing spec 0004 (enemies and combat rooms).
- M2: Exit check passed: Mikael playtested movement and combat with a real mouse and approved the feel. M1 and M2 done.
- M2: All M2 tasks built (spec 0003 done): pooled bolts with focus, dodge roll with i-frames, staff bash, flask, training dummy and totem, hitstop, damage numbers, HUD. Verify green, 56 unit and 29 E2E tests, 200 projectiles at 0.42 ms per step. Exit check waits for a human playtest.
- M2: Fixed: holding fire on empty focus kept casting at nearly full rate because focus regenerated while the button was held.
- M2: Risk: entry bundle at 20.8 of 25 KB; plan a lazy game chunk in M3.
- M1: All M1 tasks built (spec 0002 done): pointer lock and mouse look, render interpolation, kinematic controller with autostep, shoulder camera with push-in, Animator, audio with synthesized footsteps, graybox courtyard. Verify green, 41 unit and 13 E2E tests. Exit check waits for a human playtest with a real mouse.
- M1: Fixed: Rapier autostep ignored the 0.3 m dais while any downward speed was requested; grounded vertical speed is now 0.
- M1: Tuned camera framing and golden-hour lighting after screenshots showed the character covering the crosshair and faces toward the camera nearly black.
- M1: Started M1 on branch `feat/m1-tps-graybox`, writing spec 0002 (engine foundations) and spec 0003 (TPS graybox).
- M0: Initial commit `bfe8fbe` on `main`, hooks (format, lint, typecheck, commitlint) passed. M0 done.
- M0: Reviewed setup again, verify green with 19 unit and 6 E2E tests, dashboard checked at desktop, light theme and phone width.
- M0: Added progress tracking: checkbox milestones, this log, `pnpm progress` dashboard and the progress skill.
- M0: Reviewed the setup, `pnpm verify` green (perf step avg 0.10 ms, bundle 1432 / 1600 KB gzip).
- M0: Installed Playwright system dependencies on WSL and recorded the visual baselines.
- M0: Grilling session locked the design: TPS camera, browser first, spells as guns, no jump in MVP.
- M0: Copied the starter into `~/aethergate`, wrote the game design, milestones and ADR 0002.
