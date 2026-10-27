# 0001: Gem roller demo (plan)

Spec: docs/specs/0001-gem-roller-demo.md

## Approach

Entities: level (static boxes), player (dynamic ball body), gems (mesh only, distance-checked pickup).
All gameplay in fixed systems for determinism, HUD as the only frame system.

## Changes

| File                     | Change                                                                |
| ------------------------ | --------------------------------------------------------------------- |
| `src/game/components.ts` | `player`, `gem` components                                            |
| `src/game/entities/*.ts` | Level, player and gem factories                                       |
| `src/game/systems/*.ts`  | restart, player control, collect, timer, gem animation, camera follow |
| `src/game/ui/hud.ts`     | DOM HUD                                                               |
| `src/game/index.ts`      | Composition root, debug panel, test hook                              |

## Tests

See acceptance criteria in the spec.
