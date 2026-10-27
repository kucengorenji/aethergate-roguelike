// Fails when a model in public/ exceeds its budget in perf-budget.json
// (file size, triangles, skeleton bones). Reads only the glTF JSON chunk, so
// meshopt-compressed buffers need no decoding.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { coveredPaths, totalMB, unlicensed } from './asset-checks.mjs';

const config = JSON.parse(readFileSync('perf-budget.json', 'utf8'));
const budgets = config.assets ?? {};

function glbJson(file) {
  const data = readFileSync(file);
  if (data.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file} is not a GLB`);
  const length = data.readUInt32LE(12);
  return JSON.parse(data.subarray(20, 20 + length).toString('utf8'));
}

function stats(file) {
  const gltf = glbJson(file);
  let triangles = 0;
  for (const mesh of gltf.meshes ?? []) {
    for (const prim of mesh.primitives) {
      if ((prim.mode ?? 4) !== 4) continue;
      const accessor = gltf.accessors[prim.indices ?? prim.attributes.POSITION];
      triangles += accessor.count / 3;
    }
  }
  const bones = Math.max(0, ...(gltf.skins ?? []).map((skin) => skin.joints.length));
  return { kb: statSync(file).size / 1024, triangles, bones };
}

const failures = [];
for (const [path, budget] of Object.entries(budgets)) {
  const s = stats(join('public', path));
  console.log(
    `${path}: ${s.kb.toFixed(1)} / ${budget.maxKB} KB, ${s.triangles} / ${budget.maxTriangles} triangles, ${s.bones} / ${budget.maxBones} bones`,
  );
  if (s.kb > budget.maxKB) failures.push(`${path}: ${s.kb.toFixed(1)} KB > ${budget.maxKB} KB`);
  if (s.triangles > budget.maxTriangles)
    failures.push(`${path}: ${s.triangles} triangles > ${budget.maxTriangles}`);
  if (s.bones > budget.maxBones) failures.push(`${path}: ${s.bones} bones > ${budget.maxBones}`);
}
// Every shipped asset counts toward the download budget and needs a license line.
const shipped = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name !== '.gitkeep') shipped.push(relative('.', p));
  }
};
walk('public/assets');
const mb = totalMB(shipped.map((f) => statSync(f).size));
console.log(`assets: ${mb.toFixed(2)} / ${config.assetsTotalMB} MB in ${shipped.length} files`);
if (mb > config.assetsTotalMB)
  failures.push(`assets ${mb.toFixed(2)} MB > ${config.assetsTotalMB} MB`);
const missing = unlicensed(shipped, coveredPaths(readFileSync('assets-src/LICENSES.md', 'utf8')));
for (const f of missing) failures.push(`${f} has no line in assets-src/LICENSES.md`);

if (failures.length) {
  console.error(`\nAsset budget exceeded:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
