/**
 * Rapier collision groups as one number: the collider belongs to `memberships`
 * and only interacts with colliders in `filter` (16 bits each). Kept apart from
 * physics.ts so pure modules can use it without loading the Rapier wasm.
 */
export function interactionGroups(memberships: number, filter: number): number {
  return ((memberships & 0xffff) * 0x10000 + (filter & 0xffff)) >>> 0;
}
