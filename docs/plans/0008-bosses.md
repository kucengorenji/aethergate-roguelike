# 0008: Mini-boss and boss (plan)

Spec: docs/specs/0008-bosses.md

## Approach

- **Bosses are enemy kinds** (`captain`, `starfallen`) in the existing framework, so movement, damage, statuses, waves and removal work unchanged. The enemy component gains `move` (the attack chosen at wind-up), `phase` and a `pattern` counter.
- **Pure boss brains** (`src/game/ai/bosses.ts`): choose the next move from distance, phase and pattern; scale wind-ups by phase; the burning ring radius as a function of time. Unit-tested.
- **Moves resolve in the attack system**: slam and sweep on the first attack step, charge and gravity well over the attack, meteors as timed hazards in state.
- **Hazards** (`state.hazards`): meteor markers and the phase 3 ring; one system ticks them and damages the player; one frame system draws markers with instanced rings.
- **Phase changes** happen in the AI system when health crosses a threshold: stagger, shockwave, message, Captain summons.
- **Control resistance:** `addChill` takes `canFreeze`; `stagger` skips bosses unless it is the Captain's guard break.
- **UI:** a boss bar bound to the first living boss.

## Changes

| File                                                                                                | Change                                       |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `src/game/config.ts`, `components.ts`, `state.ts`                                                   | Boss tunables; move, phase, pattern; hazards |
| `src/game/ai/bosses.ts`, `brains.ts`                                                                | Boss brains; dispatch from `think`           |
| `src/game/entities/enemy.ts`                                                                        | Captain and Starfallen figures and markers   |
| `src/game/systems/enemy-ai.ts`, `enemy-attack.ts`, `enemy-motion.ts`, `hazards.ts`, `enemy-pose.ts` | Phases, moves, hazards, markers              |
| `src/game/combat/damage.ts`, `boons/effects.ts`, `boons/status.ts`                                  | Control resistance                           |
| `src/game/run/plan.ts`, `systems/waves.ts`                                                          | Real elite and boss waves; boss spawn point  |
| `src/game/ui/hud.ts`, `index.html`, `style.css`                                                     | Boss bar                                     |
| `tests/e2e/bosses.spec.ts`, `run.spec.ts`, `visual.spec.ts`                                         | Behavior, full run, baselines                |

## Changes during build

- The gravity well first added its pull to the player's stored velocity, so it built up every step and yanked the player much harder than configured; a roll could not escape. The pull now only moves the player in the step it applies. Found by the "a roll away escapes" test.
- The toast moved below the boss bar: the phase message covered the boss's name in the first screenshot.
- Summoned soldiers can come before the Captain in the enemy list, so tests find bosses by kind, not index.
- All edits in this spec went through a helper that fails when the text to replace is not found exactly once, after spec 0006 lost two edits silently.
