# 0011: Save data and UI panels (plan)

Spec: docs/specs/0011-save-and-panels.md

## Approach

- `src/game/save/data.ts`: the `SaveData` type, defaults and a pure `migrate(raw)`.
- `src/game/save/store.ts`: a `SaveStore` interface with an IndexedDB implementation and an in-memory one for unit tests; a writer that serializes saves so the last one wins.
- `state.save` holds the loaded data; `saveGame(ctx)` queues a write.
- `state.panel` names the open panel; `controlsLocked` includes it; opening a panel releases the pointer (`Input.releasePointer`).
- `ctx.suspended` (engine): fixed steps only clear input while it is set. It is separate from the test hook's `paused`, which controls stepping from tests.

## Changes

| File                                          | Change                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------- |
| `src/engine/game.ts`, `input.ts`              | `ctx.suspended`, `releasePointer`                                          |
| `src/game/save/data.ts`, `store.ts` (+ tests) | Save data, migration, stores                                               |
| `src/game/state.ts`, `index.ts`               | `save`, `panel`, `openPanel`/`closePanel`, load before start, test actions |
| `tests/e2e/save.spec.ts`                      | Reload persistence, panels lock control, suspension                        |
