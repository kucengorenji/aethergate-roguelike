// Regenerates the player character: fetches the pinned Quaternius Universal
// Animation Library (CC0, see docs/decisions/0003-asset-pipeline.md), runs the
// Blender script assets-src/player/build_player.py headless, then `pnpm assets`.
//
// Env: BLENDER (default `blender` on PATH), UAL_ZIP (use a local copy of the zip).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const LIBRARY = {
  url: 'https://opengameart.org/sites/default/files/universal_animation_librarystandard.zip',
  sha256: '18ff1a7215f4852b320203e8aaf02a1578b5c8eef9027fbaedfcedc7b85a3ac2',
};
// Exports differ between Blender releases, so the pipeline is pinned to one.
const BLENDER_VERSION = '5.2';
const OUT = 'assets-src/models/player.glb';

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

async function libraryZip() {
  if (process.env.UAL_ZIP) return verified(process.env.UAL_ZIP);
  // The download stays outside the repo: it is third-party data, not source.
  const dir = join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'aethergate');
  const file = join(dir, `ual-standard-${LIBRARY.sha256.slice(0, 12)}.zip`);
  if (!existsSync(file)) {
    console.log(`Downloading ${LIBRARY.url}`);
    const response = await fetch(LIBRARY.url);
    if (!response.ok) throw new Error(`download failed: HTTP ${response.status}`);
    const data = Buffer.from(await response.arrayBuffer());
    if (sha256(data) !== LIBRARY.sha256)
      throw new Error('downloaded library has the wrong SHA-256');
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, data);
  }
  return verified(file);
}

function verified(file) {
  if (sha256(readFileSync(file)) !== LIBRARY.sha256)
    throw new Error(`${file} does not match the pinned SHA-256 ${LIBRARY.sha256}`);
  return file;
}

const blender = process.env.BLENDER ?? 'blender';
const version = execFileSync(blender, ['--version'], { encoding: 'utf8' }).split('\n')[0];
if (!version.startsWith(`Blender ${BLENDER_VERSION}`))
  throw new Error(`expected Blender ${BLENDER_VERSION}.x, found "${version}" (set BLENDER)`);

const zip = await libraryZip();
console.log(`${version}: building ${OUT}`);
execFileSync(
  blender,
  [
    '--background',
    '--factory-startup',
    '--python-exit-code',
    '1',
    '--python',
    'assets-src/player/build_player.py',
    '--',
    '--library',
    zip,
    '--out',
    OUT,
  ],
  { stdio: 'inherit' },
);
execFileSync('pnpm', ['assets'], { stdio: 'inherit' });
execFileSync('node', ['scripts/check-asset-budget.mjs'], { stdio: 'inherit' });
