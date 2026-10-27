# 0006: Ash skill

Status: done
Owner: Mikael (built by agent)

## Problem

The design gives the player one active skill on right click, like the Cast in Hades.
Boons (spec 0007) will change it per demigod, so the skill needs a clear default and a shape that elements can modify.

## Behavior

1. **Ash Comet.** Right click hurls a heavy burning comet toward the crosshair. It flies slower than a bolt and bursts where it hits: on an enemy, on a wall, or at the aimed spot on the ground.
2. **Burst.** Every enemy within 3 m of the burst takes heavy damage and is knocked away from the center. Knight shields block it only when the burst is in front of them.
3. **Cooldown.** The skill recharges over 6 seconds. It costs no focus. It cannot be used while rolling, bashing or drinking.
4. **Feedback.** The cast kicks the camera harder than a bolt; the burst is a large flash, a camera shake, and a deep sound.
5. **HUD.** A skill icon next to the focus bar shows the remaining cooldown as a sweep and lights up when ready.
6. **Hooks for boons.** The skill carries an optional element (frost, gravity, rot, storm) that spec 0007 fills in; with no element it behaves as above.

## Acceptance criteria

- [x] Right click fires one comet toward the crosshair; a second right click during the cooldown does nothing. Verified: `skill.spec.ts` › right click hurls one comet.
- [x] A comet aimed at a group of three enemies damages all of them by the burst damage and pushes them away from the center. Verified: `skill.spec.ts` › a burst hits the whole group.
- [x] A comet aimed at the ground bursts at the aimed spot, not before. Verified: `skill.spec.ts` › comets burst at the aimed spot.
- [x] A comet aimed through cover bursts at the cover, and enemies behind it out of range are unharmed. Verified: `skill.spec.ts` › cover stops comets.
- [x] The skill cannot be cast mid-dodge. Verified: `skill.spec.ts` › no comet mid-roll.
- [x] The HUD icon shows cooldown progress and its ready state. Verified: `skill.spec.ts` › the icon shows the cooldown.
- [x] Unit tests cover the burst falloff-free area test and comet fuse distance. Verified: `src/game/combat/burst.test.ts`.
- [x] Visual baseline of a comet burst looks right; `pnpm verify` passes. Verified: `visual.spec.ts` › comet burst, reviewed by eye; other baselines re-recorded for the new HUD row after checking the diff was HUD only; `pnpm progress:verify` 2026-10-27.

## Out of scope

- Element variants (spec 0007), other skills and skill swapping (M5 unlocks).
