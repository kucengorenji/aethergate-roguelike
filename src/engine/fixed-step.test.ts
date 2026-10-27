import { describe, expect, it } from 'vitest';
import { FixedStep } from './fixed-step';

describe('FixedStep', () => {
  it('accumulates partial frames into whole steps', () => {
    const fs = new FixedStep(1 / 60);
    expect(fs.consume(1 / 120)).toBe(0);
    expect(fs.consume(1 / 120)).toBe(1);
  });

  it('runs several steps for a long frame', () => {
    const fs = new FixedStep(1 / 60);
    expect(fs.consume(3 / 60 + 0.0001)).toBe(3);
  });

  it('caps steps and drops the backlog after a stall', () => {
    const fs = new FixedStep(1 / 60, 5);
    expect(fs.consume(2)).toBe(5);
    expect(fs.consume(0)).toBe(0);
  });

  it('ignores negative frame times', () => {
    expect(new FixedStep(1 / 60).consume(-1)).toBe(0);
  });
});
