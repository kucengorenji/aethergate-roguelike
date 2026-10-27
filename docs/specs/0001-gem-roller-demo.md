# 0001: Gem roller demo

Status: superseded (replaced by spec 0002 in M1)
Owner: starter

## Problem

The starter needs a small, complete game that exercises every engine feature (rendering, physics, input, ECS, HUD, debug tools, tests), so people and agents have a working pattern to copy.

## Behavior

The player controls a ball in a walled arena with a few static obstacles.
Ten gems float and spin at random spots (layout fixed by the seed).
Rolling into a gem collects it, and the HUD shows gems collected and elapsed time.
When all gems are collected, a banner shows the time, and Enter or R starts a new round.
Falling out of the arena respawns the ball at the center.

## Acceptance criteria

- [x] WASD or arrow keys roll the ball. Verified by `gameplay.spec.ts` › "arrow keys roll the ball".
- [x] Space jumps only when touching the ground. Verified by `gameplay.spec.ts` › "space jumps only when grounded".
- [x] Collecting all gems shows the win banner, and R restarts. Verified by `gameplay.spec.ts` › "collecting every gem wins, R restarts".
- [x] The same seed produces the same scene. Verified by `visual.spec.ts`.

## Out of scope

Audio, touch controls, menus, save data.
