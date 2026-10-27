import { interactionGroups } from '@engine/collision-groups';

/** Level geometry: walls, cover, floor. Rapier's default groups include it. */
const WORLD = 0x0001;
/** Characters and targets. Projectiles hit them through hurtboxes, not rays. */
const ACTOR = 0x0002;

/** Collision groups for actor colliders: they still collide with everything. */
export const ACTOR_GROUPS = interactionGroups(ACTOR, 0xffff);
/** Ray filter that only sees level geometry (camera push-in, projectile walls, aim). */
export const WORLD_RAYS = interactionGroups(0xffff, WORLD);
