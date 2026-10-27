import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { openGame } from './helpers';

const budget = (
  JSON.parse(readFileSync('perf-budget.json', 'utf8')) as {
    frame: { maxAvgStepMs: number; maxP95StepMs: number };
  }
).frame;

// CPU timings are only meaningful without other browsers competing for the cores.
test.describe.configure({ mode: 'serial' });

// Measures CPU time of the simulation step (systems + physics). GPU time in a
// headless browser says nothing about player hardware, so it is not budgeted here;
// check it manually with the debug overlay on target devices.
test('simulation step stays within the CPU budget', async ({ page }) => {
  await openGame(page, 'test&seed=1&mode=training');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.__game!.resetStepTimes();
  });
  await page.waitForTimeout(3000);
  await page.keyboard.up('KeyW');
  const stats = await page.evaluate(() => window.__game!.stepTimes());
  console.log(
    `step ms: avg ${stats.avg.toFixed(3)}, p95 ${stats.p95.toFixed(3)}, max ${stats.max.toFixed(3)} over ${stats.count} steps`,
  );
  expect(stats.count).toBeGreaterThan(60);
  expect(stats.avg).toBeLessThanOrEqual(budget.maxAvgStepMs);
  expect(stats.p95).toBeLessThanOrEqual(budget.maxP95StepMs);
});

/**
 * Heavy scenarios step the simulation inside the page (paused session) instead of
 * timing the live loop: the budget is CPU time per simulation step, and in the
 * live loop software rendering and any other load on the machine interleave with
 * the steps and inflate the numbers (main failed the same way under load).
 */
async function stepLoad(page: Page, setup: string, mode: string) {
  await openGame(page, `test&seed=1&paused&mode=${mode}`);
  return page.evaluate((code) => {
    const g = window.__game!;
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    (new Function('g', code) as (game: typeof g) => void)(g);
    g.advanceSync(30);
    g.resetStepTimes();
    g.advanceSync(240);
    const s = g.inspect() as { projectiles: number; enemies: unknown[] };
    return { ...g.stepTimes(), projectiles: s.projectiles, enemies: s.enemies.length };
  }, setup);
}

test('200 projectiles stay within the CPU budget', async ({ page }) => {
  const stats = await stepLoad(page, "g.act('spawnProjectiles', 200);", 'training');
  console.log(
    `200 projectiles, step ms: avg ${stats.avg.toFixed(3)}, p95 ${stats.p95.toFixed(3)}, max ${stats.max.toFixed(3)}, ${stats.projectiles} live`,
  );
  expect(stats.projectiles).toBeGreaterThan(150);
  expect(stats.avg).toBeLessThanOrEqual(budget.maxAvgStepMs);
  expect(stats.p95).toBeLessThanOrEqual(budget.maxP95StepMs);
});

test('30 enemies with statuses and 200 projectiles stay within the CPU budget', async ({
  page,
}) => {
  // Every enemy carries chill and a little rot, so status ticking is part of the
  // budget without rot killing enemies during the measurement.
  const stats = await stepLoad(
    page,
    `for (let i = 0; i < 30; i++) g.act('spawnEnemy', i % 4, -15 + (i % 6) * 6, -16 + Math.floor(i / 6) * 5);
     for (let i = 0; i < 30; i++) { g.act('addStatus', i, 0, 1); g.act('addStatus', i, 2, 1); }
     g.act('spawnProjectiles', 200);`,
    'sandbox',
  );
  console.log(
    `30 enemies + 200 projectiles, step ms: avg ${stats.avg.toFixed(3)}, p95 ${stats.p95.toFixed(3)}, max ${stats.max.toFixed(3)}, ${stats.enemies} enemies`,
  );
  expect(stats.enemies).toBe(30);
  expect(stats.avg).toBeLessThanOrEqual(budget.maxAvgStepMs);
  expect(stats.p95).toBeLessThanOrEqual(budget.maxP95StepMs);
});

test('room changes stay smooth', async ({ page }) => {
  await openGame(page, 'test&seed=7&paused&mode=run');
  const stats = await page.evaluate(() => {
    const g = window.__game!;
    g.resetStepTimes();
    for (let room = 1; room < 8; room++) {
      g.act('goToRoom', room, 0);
      g.advanceSync(20);
    }
    return g.stepTimes();
  });
  console.log(
    `room changes, step ms: avg ${stats.avg.toFixed(3)}, p95 ${stats.p95.toFixed(3)}, max ${stats.max.toFixed(3)}`,
  );
  expect(stats.p95).toBeLessThanOrEqual(budget.maxP95StepMs);
});
