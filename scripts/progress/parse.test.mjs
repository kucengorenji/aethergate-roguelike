import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDocHeader, parseLog, parseMilestones, parseVerifyOutput, table } from './parse.mjs';

const MILESTONES = `# Milestones

## M0: Setup

Weeks: day 0

- [x] Repo created.
- [x] **Exit:** verify is green.

## M1: Foundations

Weeks: 1

A note.

- [x] Mouse input (spec 0002).
- [~] Camera.
- [ ] Audio.
- [ ] **Exit:** walk around.

## M2: Combat

- [ ] Spells.

## Main risks

| Risk | Mitigation |
| ---- | ---------- |
| Anim | Library    |
`;

describe('parseMilestones', () => {
  const { milestones, risks } = parseMilestones(MILESTONES);

  it('derives status from task markers, exit check included', () => {
    expect(milestones.map((m) => [m.id, m.status, m.done, m.total])).toEqual([
      ['M0', 'done', 2, 2],
      ['M1', 'active', 1, 4],
      ['M2', 'planned', 0, 1],
    ]);
  });

  it('separates the exit check, weeks and notes from tasks', () => {
    const m1 = milestones[1];
    expect(m1.weeks).toBe('1');
    expect(m1.notes).toEqual(['A note.']);
    expect(m1.tasks.map((t) => t.state)).toEqual(['done', 'active', 'todo']);
    expect(m1.exit).toEqual({ state: 'todo', text: 'walk around.' });
  });

  it('reads the risk table', () => {
    expect(risks).toEqual([['Anim', 'Library']]);
  });

  it('parses the real milestones file without losing tasks', () => {
    const md = readFileSync('docs/milestones.md', 'utf8');
    const real = parseMilestones(md).milestones;
    const taskLines = md.split('\n').filter((l) => /^- \[[x~ ]\] /.test(l)).length;
    expect(real.length).toBeGreaterThan(0);
    expect(real.reduce((n, m) => n + m.total, 0)).toBe(taskLines);
    expect(real.every((m) => m.exit !== null)).toBe(true);
  });
});

describe('parseLog', () => {
  it('reads dated entries and the no-milestone marker', () => {
    const md = '# Log\n\nIntro.\n\n## 2026-10-28\n\n- M1: b\n- --: c\n\n## 2026-10-27\n\n- M0: a\n';
    expect(parseLog(md)).toEqual([
      { date: '2026-10-28', milestone: 'M1', text: 'b' },
      { date: '2026-10-28', milestone: null, text: 'c' },
      { date: '2026-10-27', milestone: 'M0', text: 'a' },
    ]);
  });

  it('parses every entry of the real log', () => {
    const md = readFileSync('docs/progress/log.md', 'utf8');
    const lines = md.split('\n').filter((l) => /^- (M\d+|--): /.test(l)).length;
    expect(parseLog(md)).toHaveLength(lines);
  });
});

describe('helpers', () => {
  it('reads doc headers', () => {
    expect(parseDocHeader('# 0002: Mouse\n\nStatus: draft\n')).toEqual({
      title: '0002: Mouse',
      status: 'draft',
    });
  });

  it('skips the table separator row', () => {
    expect(table('| a | b |\n| - | - |\n| 1 | 2 |')).toEqual({
      header: ['a', 'b'],
      rows: [['1', '2']],
    });
  });

  it('extracts budget numbers from verify output', () => {
    const out =
      'Tests  10 passed (10)\n  6 passed (4.1s)\nentry 9.5 KB / 25 KB, total 1432.0 KB / 1600 KB (gzip)\nstep ms: avg 0.104, p95 0.300, max 1.4';
    expect(parseVerifyOutput(out)).toEqual({
      entryKB: 9.5,
      totalKB: 1432,
      stepAvgMs: 0.104,
      stepP95Ms: 0.3,
      unitTests: 10,
      e2eTests: 6,
    });
  });
});
