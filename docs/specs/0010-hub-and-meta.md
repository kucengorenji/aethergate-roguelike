# 0010: The Kindled Hall and meta progression

Status: done
Owner: Mikael (built by agent)

## Problem

Runs end and nothing carries over.
M5 needs a home between runs where Lumen shards buy lasting power and new staffs, so the player always sees the next unlock.

## Behavior

1. **The Kindled Hall.** The game (without `?mode`) starts in a small ruined hall with three stations: a grace site to begin a run, an altar of upgrades, and a staff rack. Standing near a station shows its prompt; E uses it.
2. **Runs from the hall.** The grace site starts a run with a seed derived from the run count. Death ("You fell") and victory ("The Aethergate opens") both offer "E Return to the hall". Returning banks every Lumen shard from the run, counts the run (and the win, and the best time), saves, and puts the player back in the hall at full strength without blessings.
3. **More shards.** Besides shard rewards (25), killing the Ward Captain gives 40 and the Starfallen Knight 100.
4. **Upgrades at the altar** (each level costs more; levels and costs in `config.ts`): Vigor (+15 max health, 3 levels), Deep Focus (+15 max focus, 3), Flask Bearer (+1 flask, 2), Ember Bolts (+2 bolt damage, 3), Swift Ash (comet cooldown -0.75 s, 2), Steady Step (+0.08 s roll invulnerability, 2). Bought levels apply from the next run.
5. **Staffs at the rack.** The Glint Staff is owned from the start. The Lance Staff (slow, heavy bolts that pierce up to two enemies) and the Scatter Staff (three weaker bolts in a fan) cost 80 shards to unlock. One staff is equipped for the next run.
6. **Panels.** The altar and rack open panels (spec 0011): clickable rows with name, effect, level pips and cost; unaffordable or maxed rows are disabled; Close or Esc returns to the hall.
7. **Saved.** Shards, upgrades, staffs and stats persist (spec 0011).
8. **Pause menu.** Gains "Abandon run" during a run, which returns to the hall keeping the shards earned so far.

## Acceptance criteria

- [x] Without `?mode` the game starts in the hall; E at the grace site starts room 1 of a run. Verified: `hub.spec.ts` › the game starts in the hall and the grace site starts a run.
- [x] Dying and pressing E returns to the hall with the run's shards banked and the run counted; victory counts a win and the best time. Verified: `hub.spec.ts` › dying returns to the hall with the shards banked; victory counts a win and the best time.
- [x] Buying an upgrade spends shards, raises its level, persists across a reload, and changes the next run (for example Vigor: 115 max health). Verified: `hub.spec.ts` › upgrades cost shards, persist, and change the next run.
- [x] Unaffordable and maxed upgrades cannot be bought. Verified: `hub.spec.ts` › upgrades cost shards (disabled buttons); `meta.test.ts`.
- [x] Unlocking and equipping the Lance Staff makes bolts pierce through two enemies; the Scatter Staff fires three bolts. Verified: `hub.spec.ts` › the Lance Staff pierces through a line of enemies; the Scatter Staff fires three bolts.
- [x] Killing the Captain and the Starfallen Knight grants 40 and 100 shards. Verified: `hub.spec.ts` › the Ward Captain is worth 40 shards; victory counts a win (100 from the boss).
- [x] Abandoning a run from the pause menu returns to the hall and banks its shards. Verified: `hub.spec.ts` › abandoning a run from the pause menu returns to the hall.
- [x] Unit tests cover upgrade costs and effects, staff definitions, and banking. Verified: `src/game/meta/meta.test.ts`.
- [x] Visual baselines of the hall, the altar panel and the staff rack look right; `pnpm verify` passes. Verified: `visual.spec.ts` › the Kindled Hall, hall panel: altar-panel and staff-rack-panel, reviewed by eye; `pnpm progress:verify` 2026-10-27.

## Out of scope

- Hub characters and dialogue, more staffs, respec.
