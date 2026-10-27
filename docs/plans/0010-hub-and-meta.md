# 0010: The Kindled Hall and meta progression (plan)

Spec: docs/specs/0010-hub-and-meta.md

## Approach

- **Mode `hub`** becomes the default when no `?mode` is given. A run in hub mode is the same run as in `run` mode; `state.run.active` gates the run systems instead of the mode, and the end of a run returns to the hall instead of starting a new run.
- **Meta data is pure** (`src/game/meta/`): upgrade and staff definitions, costs, `canBuy`/`buy`, the player's run loadout computed from the save, and banking a run's results. Unit-tested.
- **Stations** are room entities in the hall layout; the interact system handles them and the HUD shows their prompt.
- **Loadout at run start:** max health, focus, flasks, comet cooldown, roll invulnerability, bolt damage bonus and the equipped staff come from the save.
- **Staffs:** cast reads the equipped staff's definition (interval, damage, cost, speed, count, spread, pierce). The projectile pool gains a pierce count; a piercing bolt continues past its target.
- **Panels:** shop and staffs panels are DOM lists with buttons; they rely on spec 0011's panels for input and pointer handling.

## Changes

| File                                                                                                                | Change                                                   |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `src/game/meta/upgrades.ts`, `staffs.ts`, `bank.ts` (+ tests)                                                       | Definitions, buying, loadout, banking                    |
| `src/game/arenas/layouts.ts`                                                                                        | The Kindled Hall                                         |
| `src/game/entities/station.ts`                                                                                      | Grace site, altar, staff rack                            |
| `src/game/systems/run.ts`, `interact.ts`, `restart.ts`, `cast.ts`, `actions.ts`, `projectiles.ts`, `enemy-death.ts` | Hub flow, stations, loadout, staffs, pierce, boss shards |
| `src/game/state.ts`, `components.ts`, `config.ts`, `combat/projectiles.ts`                                          | `run.active`, loadout, tunables, pierce                  |
| `src/game/ui/meta.ts`, `hud.ts`, `index.html`, `style.css`                                                          | Shop and staffs panels, prompts, banners                 |
| `tests/e2e/hub.spec.ts`, `visual.spec.ts`                                                                           | Hub flow, upgrades, staffs, baselines                    |
