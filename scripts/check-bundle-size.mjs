// Fails when the production bundle grows past perf-budget.json.
// "Entry" is the app chunk loaded by index.html; vendor chunks count toward the total only.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const budget = JSON.parse(readFileSync('perf-budget.json', 'utf8')).bundle;
const dir = 'dist/assets';
const html = readFileSync('dist/index.html', 'utf8');
const entryName = /src="\/assets\/([^"]+\.js)"/.exec(html)?.[1];

const kb = (bytes) => bytes / 1024;
let total = 0;
let entry = 0;
const rows = [];
for (const name of readdirSync(dir)) {
  if (name.endsWith('.map') || !statSync(join(dir, name)).isFile()) continue;
  const gz = kb(gzipSync(readFileSync(join(dir, name))).length);
  total += gz;
  if (name === entryName) entry = gz;
  rows.push([name, gz]);
}
rows.sort((a, b) => b[1] - a[1]);
for (const [name, gz] of rows) console.log(`${gz.toFixed(1).padStart(9)} KB  ${name}`);

const failures = [];
if (!entryName) failures.push('could not find the entry script in dist/index.html');
if (total > budget.maxTotalGzipKB)
  failures.push(`total ${total.toFixed(1)} KB > budget ${budget.maxTotalGzipKB} KB`);
if (entry > budget.maxEntryGzipKB)
  failures.push(`entry ${entry.toFixed(1)} KB > budget ${budget.maxEntryGzipKB} KB`);

console.log(
  `\nentry ${entry.toFixed(1)} KB / ${budget.maxEntryGzipKB} KB, total ${total.toFixed(1)} KB / ${budget.maxTotalGzipKB} KB (gzip)`,
);
if (failures.length) {
  console.error(`\nBundle budget exceeded:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
