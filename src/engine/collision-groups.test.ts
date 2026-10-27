import { describe, expect, it } from 'vitest';
import { interactionGroups } from './collision-groups';

describe('interactionGroups', () => {
  it('packs memberships into the high and filter into the low 16 bits', () => {
    expect(interactionGroups(0x0002, 0xffff)).toBe(0x0002ffff);
    expect(interactionGroups(0xffff, 0x0001)).toBe(0xffff0001);
  });

  it('stays an unsigned 32-bit number', () => {
    expect(interactionGroups(0xffff, 0xffff)).toBe(0xffffffff);
  });
});
