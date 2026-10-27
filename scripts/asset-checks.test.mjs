import { describe, expect, it } from 'vitest';
import { coveredPaths, totalMB, unlicensed } from './asset-checks.mjs';

const manifest = `| File | Source |
| --- | --- |
| \`public/assets/models/player.glb\` | Blender script |
| \`public/assets/audio/\` | ElevenLabs |
| not a path | x |`;

describe('asset checks', () => {
  it('reads the backticked paths of the first column', () => {
    expect(coveredPaths(manifest)).toEqual([
      'public/assets/models/player.glb',
      'public/assets/audio/',
    ]);
  });

  it('finds files no line covers, with folders covering everything below', () => {
    const files = [
      'public/assets/models/player.glb',
      'public/assets/audio/sfx/cast.ogg',
      'public/assets/models/soldier.glb',
    ];
    expect(unlicensed(files, coveredPaths(manifest))).toEqual(['public/assets/models/soldier.glb']);
  });

  it('adds sizes in megabytes', () => {
    expect(totalMB([1024 * 1024, 512 * 1024])).toBe(1.5);
  });
});
