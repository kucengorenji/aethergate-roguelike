# 0011: Save data and UI panels

Status: done
Owner: Mikael (built by agent)

## Problem

M5 needs progress that survives closing the browser (shards, upgrades, unlocked staffs, settings), and menus that take over input: the title screen, the pause menu, settings, and the hub's shop.
Both are foundations the hub (spec 0010) and the menus (spec 0012) build on, so they come first.

## Behavior

1. **Save data** lives in the browser's IndexedDB under one versioned record: Lumen shards, upgrade levels, unlocked and selected staff, settings (mouse sensitivity, volume, quality) and run stats (runs, wins, best time).
2. It is loaded before the first frame and written whenever it changes. A missing, damaged or partly filled record falls back to defaults field by field; a record from a newer version is not overwritten.
3. **Panels:** at most one panel is open at a time (title, pause, settings, shop, staffs). While one is open the player cannot move, cast or roll, the pointer is released so menus can be clicked, and clicking the game after closing relocks it.
4. **Suspending:** the pause menu stops the simulation (enemies, timers, projectiles) while the scene stays drawn.

## Acceptance criteria

- [x] `migrate` fills defaults for missing or wrongly typed fields, keeps valid ones, and refuses to downgrade a newer version (unit tests). Verified: `src/game/save/data.test.ts`.
- [x] Saves are written in order and the last write wins (unit test with an in-memory store). Verified: `src/game/save/store.test.ts`.
- [x] Save data survives a page reload in the browser (E2E). Verified: `save.spec.ts` › save data survives a reload.
- [x] While a panel is open the player cannot act; while suspended, fixed steps change nothing (E2E). Verified: `save.spec.ts` › an open panel stops the player and frees the pointer; a suspended game simulates nothing.
- [x] `pnpm verify` passes. Verified: `pnpm progress:verify` 2026-10-27.

## Out of scope

- What the panels contain (specs 0010 and 0012), cloud saves, several save slots.
