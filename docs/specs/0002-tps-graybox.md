# 0002: TPS graybox

Status: done
Owner: Mikael (built by agent)

## Problem

The starter is a top-down ball roller.
Aethergate is an over-the-shoulder spell shooter, so before any combat exists we need to prove the core feel: moving a character through an arena with a mouse-aimed camera, smoothly, at 60 fps.
This is milestone M1 in `docs/milestones.md`.

## Behavior

1. The game opens in a graybox arena at golden hour: a walled ruin about 40 by 40 meters with pillars, low walls and a broken arch as cover, under warm fog.
2. A "Click to play" prompt shows until the pointer is locked. Clicking the game locks the pointer and hides the prompt. Esc releases it and the prompt returns.
3. Moving the mouse turns the camera (yaw) and tilts it (pitch, clamped so you cannot look straight up or down). The camera sits behind the right shoulder.
4. A center crosshair is always visible while playing.
5. WASD moves the character relative to where the camera looks. The character always faces the camera's direction (shooter strafing). Diagonals are not faster.
6. The character walks on the floor, cannot pass through walls or cover, and steps up small ledges (up to 0.35 m).
7. When the camera would end up inside a wall or pillar, it pushes in toward the character instead of clipping.
8. The character is a simple robed mannequin that plays an idle animation when standing and a run cycle when moving (played backward when moving backward).
9. Soft footstep sounds play in rhythm while running (placeholder synthesized sounds).
10. Motion and camera are smooth on 120 Hz and 144 Hz displays, even though the simulation runs at 60 Hz.
11. R resets the character to the spawn point.
12. The gem demo (spec 0001) is gone.

## Acceptance criteria

- [x] On load, the player stands on the floor at spawn and the inspect snapshot reports the `idle` animation. Verified: `gameplay.spec.ts` › spawns idle on the floor.
- [x] Injected mouse look of 90 degrees to the right, then holding W, moves the player along the new forward direction (+x when spawn faces -z). Verified: `gameplay.spec.ts` › W moves where the camera looks.
- [x] Holding W and D together moves at the same speed as W alone (within 2%). Verified: `gameplay.spec.ts` › diagonals are not faster.
- [x] Holding W toward a wall for 5 seconds leaves the player inside the arena. Verified: `gameplay.spec.ts` › walls keep the player in the arena.
- [x] The player climbs a 0.3 m step and is blocked by a 1 m wall. Verified: `gameplay.spec.ts` › climbs small steps, not walls.
- [x] Pitch stays within the configured limits after large mouse moves. Verified: `gameplay.spec.ts` › pitch is clamped.
- [x] With the player backed against a wall, the camera is closer to the player than the default distance and is not inside the wall. Verified: `gameplay.spec.ts` › camera pushes in before walls.
- [x] The animation switches to `run` while moving and back to `idle` after stopping. Verified: `gameplay.spec.ts` › run animation while moving; skinned rig in `animation.test.ts`.
- [x] The click-to-play prompt is visible when the pointer is not locked and hidden when it is. Verified: `gameplay.spec.ts` › prompt shows until the pointer is locked.
- [x] Render interpolation: `FixedStep.alpha` reports the leftover fraction of a step (unit test), and paused rendering shows the latest step exactly. Verified: `fixed-step.test.ts`, `interpolation.test.ts`.
- [x] Input unit tests: mouse delta is consumed once per fixed step, buttons report edges, nothing is read while unlocked. Verified: `input.test.ts`.
- [x] Visual baseline of the arena from the player's shoulder is recorded and looks right (no z-fighting, clipping or missing shadows). Verified: `visual.spec.ts`, 3 baselines reviewed by eye.
- [x] `pnpm verify` passes, simulation step stays within the CPU budget. Verified: `pnpm progress:verify` 2026-10-27.

## Out of scope

- Shooting, dodge, melee, health (M2).
- Jumping (post-MVP).
- Real character art and animation library clips (M6). The mannequin proves the animation pipeline only.
- Gamepad, settings menu, mouse sensitivity UI (sensitivity is a tunable in `config.ts` and the debug panel).

## Open questions

- Mouse sensitivity default needs real-hardware tuning. Start at 0.0022 rad per pixel.
