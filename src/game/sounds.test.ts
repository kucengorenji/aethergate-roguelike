import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** All game source, so the test sees every audio.play and audio.register call. */
function source(dir = 'src/game'): string {
  return readdirSync(dir)
    .map((f) => join(dir, f))
    .map((p) =>
      statSync(p).isDirectory()
        ? source(p)
        : p.endsWith('.ts') && !p.endsWith('.test.ts')
          ? readFileSync(p, 'utf8')
          : '',
    )
    .join('\n');
}

describe('sounds', () => {
  it('registers every sound the game plays', () => {
    const code = source();
    const names = (re: RegExp) => new Set([...code.matchAll(re)].map((m) => m[1]!));
    const played = names(/audio\.play\(\s*'([a-z]+)'/g);
    const registered = names(/audio\.register\(\s*'([a-z]+)'/g);
    expect([...played].filter((n) => !registered.has(n))).toEqual([]);
    expect(played.size).toBeGreaterThan(10);
  });
});
