// Optimizes every .glb/.gltf in assets-src/models into public/assets/models:
// dedupe, prune, weld, meshopt geometry compression and WebP textures (max 2048px).
// Load the results with loadModel() from src/engine/assets.ts.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

const SRC = 'assets-src/models';
const OUT = 'public/assets/models';
mkdirSync(OUT, { recursive: true });

const files = readdirSync(SRC).filter((f) => ['.glb', '.gltf'].includes(extname(f).toLowerCase()));
if (files.length === 0) {
  console.log(`No models in ${SRC}. Drop .glb/.gltf files there and re-run.`);
  process.exit(0);
}

for (const file of files) {
  const out = join(OUT, `${basename(file, extname(file))}.glb`);
  console.log(`${file} -> ${out}`);
  execFileSync(
    'gltf-transform',
    [
      'optimize',
      join(SRC, file),
      out,
      '--compress',
      'meshopt',
      '--texture-compress',
      'webp',
      '--texture-size',
      '2048',
    ],
    { stdio: 'inherit' },
  );
}
