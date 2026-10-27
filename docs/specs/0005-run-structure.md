# 0005: Run structure

Status: done
Owner: Mikael (built by agent)

## Problem

Milestone M4 needs a run: a sequence of rooms with choices between them, so each attempt has a shape and a destination.
Everything else in M4 (Ash skill, boons, bosses) plugs into this structure.

## Behavior

1. **A run** is 8 rooms: combat, combat, grace, combat, elite, combat, grace, boss. The plan comes from the run seed, so `?seed=` reproduces the same rooms, layouts, waves and door offers.
2. **Layouts.** Combat rooms draw from 6 handcrafted arenas without repeating the previous one. Grace rooms, the elite room and the boss room have their own layouts.
3. **Waves** scale with depth: early rooms have 2 small waves, later rooms 3 bigger ones. The elite and boss rooms are placeholders until spec 0008 (a reinforced knight with escorts, and a large final wave).
4. **Rewards.** Every room grants the reward of the door you took to enter it: a Blessing (boon, chosen in spec 0007; counted for now), Lumen shards (currency for M5), a Heal (30% of max health) or a Flask charge. Combat rooms grant it when the last wave dies; grace rooms right away. The first room always grants a Blessing.
5. **Pickup.** The reward appears as a glowing token in the room; walking into it takes it, with a sound and a short message.
6. **Doors.** After the reward is taken, two doors light up on the far side of the room (one before the boss), each showing the reward behind it by color and label. Standing near a door shows "E Enter: Blessing"; E fades out, loads the next room, and fades in with the player at the room's entrance.
7. **Start.** The first room waits for the pointer lock like the M3 encounter. Later rooms start their first wave 1.5 s after the fade-in.
8. **End.** Clearing the boss room shows "The Aethergate opens" with the run time; R starts a new run. Dying shows "You fell"; R starts a new run with the next seed.
9. **HUD.** The top label shows "Room 3 / 8" plus the wave or "Grace"; the top right shows Blessings and Lumen shards collected this run.
10. **Modes.** The run is the default mode. `?mode=encounter` keeps the single three-wave chamber from spec 0004; `training` and `sandbox` are unchanged.

## Acceptance criteria

- [x] The run plan has 8 rooms in the fixed order, combat layouts never repeat back to back, door offers are two different rewards, and waves grow with depth (unit tests). Verified: `src/game/run/plan.test.ts`, plus `src/game/arenas/layouts.test.ts` for every layout's entrance, doors, reward point and spawns.
- [x] The same seed gives the same plan; different seeds give different plans (unit and E2E). Verified: `plan.test.ts` and `run.spec.ts` › the same seed plays the same run.
- [x] Clearing a combat room spawns the reward token; taking it applies the reward and opens the doors. Verified: `run.spec.ts` › clearing a room offers its reward, then doors.
- [x] A grace room has no enemies and grants its reward right away. Verified: `run.spec.ts` › grace rooms reward without a fight.
- [x] Entering a door loads the next room: the old room's bodies are gone, the player stands at the new entrance, and the HUD shows the new room number. Verified: `run.spec.ts` › a door loads the next room.
- [x] Heal and Flask rewards change health and flask charges; Blessing and shard counts show on the HUD. Verified: `run.spec.ts` › rewards change the run, grace rooms reward without a fight.
- [x] An E2E test plays a full seeded run through all 8 rooms to "The Aethergate opens". Verified: `run.spec.ts` › a seeded run reaches the Aethergate.
- [x] Dying and pressing R starts a new run at room 1 with full health. Verified: `run.spec.ts` › dying starts a new run.
- [x] Visual baselines of an open door choice and a grace room look right. Verified: `visual.spec.ts` › door choice after taking the reward, grace room with its reward.
- [x] Step time stays within budget across room changes; `pnpm verify` passes. Verified: `perf.spec.ts` › room changes stay smooth (p95 0.7 ms); `pnpm progress:verify` 2026-10-27.

## Out of scope

- Boon choice UI and effects (0007), the Ash skill (0006), real mini-boss and boss fights (0008).
- The hub and spending shards (M5).

## Open questions

- Reward amounts and wave budgets are first guesses in `config.ts`.
