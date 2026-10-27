import { interactionGroups } from '@engine/collision-groups';

/** Level geometry: walls, cover, floor. Rapier's default groups include it. */
const WORLD = 0x0001;
/** The player and training targets. Projectiles hit them through hurtboxes, not rays. */
const ACTOR = 0x0002;
/** Enemies. */
const ENEMY = 0x0004;

/** Collision groups for the player and dummies: they collide with everything. */
export const ACTOR_GROUPS = interactionGroups(ACTOR, 0xffff);
/**
 * Enemies collide with the level and the player but not with each other:
 * overlapping capsules lock the character controller, so separation steering
 * keeps enemies apart instead.
 */
export const ENEMY_GROUPS = interactionGroups(ENEMY, 0xffff & ~ENEMY);
/** Ray filter that only sees level geometry (camera push-in, projectile walls, aim). */
export const WORLD_RAYS = interactionGroups(0xffff, WORLD);
