# 0004: Enemies and combat rooms

Status: done
Owner: Mikael (built by agent)

## Problem

Milestone M3: the verbs from M2 need opponents.
A single arena with three waves must be tense, readable and fair before we build a run out of rooms (M4).

## Behavior

1. **Modes.** The game opens in the encounter. `?mode=training` keeps the M2 courtyard with the dummy and the totem for practice and tests.
2. **Encounter start.** Nothing attacks while the click-to-play prompt shows. Two seconds after the pointer is first locked, wave 1 begins.
3. **Waves.** Three waves of mixed enemies. When every enemy of a wave is dead, the next one starts after a short pause. A "Wave 2 / 3" label shows at the top.
4. **Spawning.** Enemies rise out of the ground at spawn points away from the player. A glowing mark shows where they will appear. They cannot act or be hurt while rising.
5. **Telegraphs.** Every enemy attack has a visible wind-up of at least 0.4 s: the enemy leans back and its eyes or gem glow. Area attacks also show a ground marker of the area that will be hit.
6. **Hollow Soldier.** Comes in groups, walks at the player, winds up and lunges with a short-range sword swing.
7. **Thorn Caster.** Keeps 8 to 13 m away, strafes sideways, backs off when the player comes close, and fires an orb after a glowing charge-up.
8. **Ward Knight.** Slow and tough. Its shield blocks bolts from the front (a spark and a dull sound, no damage). Bolts from the side or back hurt it. A staff bash breaks its guard and staggers it for a moment. It slams the ground in front of it after a long wind-up with a ground marker.
9. **Rot Hound.** Fast. Circles to the player's side, then leaps in a straight line. Punishes standing still.
10. **Hit reactions.** Bolts make enemies flinch (flash, small push). A bash staggers any enemy, interrupting its wind-up.
11. **Death.** Enemies collapse and sink into the ground, then disappear.
12. **Room clear.** After the last wave: "Chamber cleared" shows, and the player can keep walking around. R restarts the whole encounter.
13. **Separation.** Enemies do not stack inside each other or the player.

## Acceptance criteria

- [x] No enemy exists until the pointer is locked; wave 1 spawns about 2 s after the lock. Verified: `enemies.spec.ts` › waves wait for the pointer lock.
- [x] Enemies cannot be damaged and do not move while rising. Verified: `enemies.spec.ts` › rising enemies are untouchable.
- [x] A Hollow Soldier closes in on the player, winds up for at least 0.4 s, then damages the player if still in reach. Verified: `enemies.spec.ts` › soldiers telegraph before they hit (0.5 s wind-up, 12 damage).
- [x] Dodging through a soldier's lunge avoids the damage. Verified: `enemies.spec.ts` › dodging a lunge avoids damage.
- [x] A Thorn Caster placed 4 m from the player backs off to at least 7 m. Verified: `enemies.spec.ts` › casters keep their distance.
- [x] A Ward Knight takes no damage from a bolt to its shield, takes damage from a bolt to its back, and a bash breaks its guard so a frontal bolt then hurts. Verified: `enemies.spec.ts` › knight shields block from the front.
- [x] A Rot Hound reaches the player faster than a Hollow Soldier from the same distance. Verified: `enemies.spec.ts` › hounds are faster than soldiers.
- [x] A bash interrupts a wind-up (stagger). Verified: `enemies.spec.ts` › a bash interrupts a wind-up.
- [x] Killing every enemy of all three waves shows "Chamber cleared"; the wave label counts up along the way. Verified: `enemies.spec.ts` › clearing three waves clears the chamber.
- [x] Dead enemies are removed from the world and physics. Verified: `enemies.spec.ts` › dead enemies are removed (body count back to baseline).
- [x] R restarts the encounter from wave 1 with full health. Verified: `enemies.spec.ts` › R restarts the encounter.
- [x] Enemies keep apart (no two enemy centers closer than their radii after crowding). Verified: `enemies.spec.ts` › enemies spawned on one spot spread apart, a crowd closing on the player keeps apart.
- [x] The AI state machine and steering have unit tests. Verified: `brains.test.ts`, `steering.test.ts`, `guard.test.ts`.
- [x] 30 enemies plus 200 projectiles stay within the CPU step budget. Verified: `perf.spec.ts`, avg 1.19 ms and p95 2.1 ms per step.
- [x] Visual baseline of a wave fight with a telegraph visible looks right. Verified: `visual.spec.ts` › wave fight with a telegraph, reviewed by eye.
- [x] `pnpm verify` passes. Verified: `pnpm progress:verify` 2026-10-27.

## Out of scope

- Several rooms, doors and rewards (M4). The cleared chamber is a dead end for now.
- Real enemy models and animation (M6). Enemies are procedural graybox figures.
- Navmesh pathing around cover. Arenas are open enough for steering with obstacle avoidance by the character controller.

## Open questions

- Wave composition and enemy numbers are first guesses in `config.ts`, to tune in playtest.
