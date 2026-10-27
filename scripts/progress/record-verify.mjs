// Runs `pnpm verify`, streams its output, and records the result for the dashboard.
// Exits with verify's exit code, so it can replace `pnpm verify` anywhere.
import { spawn, execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { parseVerifyOutput } from './parse.mjs';

const OUT = 'docs/progress/verify.json';

const git = (cmd) => {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

const started = Date.now();
let output = '';
const child = spawn('pnpm', ['verify'], { stdio: ['inherit', 'pipe', 'pipe'] });
for (const stream of [child.stdout, child.stderr]) {
  stream.on('data', (chunk) => {
    output += chunk;
    (stream === child.stdout ? process.stdout : process.stderr).write(chunk);
  });
}

child.on('close', (code) => {
  // pnpm echoes each script as "$ <command>", so the last one is where a failure happened.
  const steps = [...output.matchAll(/^\$ (.+)$/gm)].map((m) => m[1]);
  const result = {
    ok: code === 0,
    exitCode: code,
    at: new Date().toISOString(),
    durationSec: Math.round((Date.now() - started) / 1000),
    head: git('rev-parse --short HEAD'),
    dirtyFiles: git('status --porcelain').split('\n').filter(Boolean).length,
    failedStep: code === 0 ? null : (steps.at(-1) ?? null),
    ...parseVerifyOutput(output),
  };
  writeFileSync(OUT, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`\nRecorded verify result in ${OUT} (${result.ok ? 'pass' : 'FAIL'}).`);
  process.exit(code ?? 1);
});
