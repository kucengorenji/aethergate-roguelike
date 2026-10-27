import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
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

test('200 projectiles stay within the CPU budget', async ({ page }) => {
  await openGame(page, 'test&seed=1&mode=training');
  await page.evaluate(() => {
    window.__game!.act('spawnProjectiles', 200);
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.__game!.resetStepTimes();
  });
  await page.waitForTimeout(3000);
  const stats = await page.evaluate(() => window.__game!.stepTimes());
  const live = await page.evaluate(
    () => (window.__game!.inspect() as { projectiles: number }).projectiles,
  );
  console.log(
    `200 projectiles, step ms: avg ${stats.avg.toFixed(3)}, p95 ${stats.p95.toFixed(3)}, max ${stats.max.toFixed(3)} over ${stats.count} steps, ${live} live`,
  );
  expect(live).toBeGreaterThan(150);
  expect(stats.count).toBeGreaterThan(60);
  expect(stats.avg).toBeLessThanOrEqual(budget.maxAvgStepMs);
  expect(stats.p95).toBeLessThanOrEqual(budget.maxP95StepMs);
});

test('30 enemies and 200 projectiles stay within the CPU budget', async ({ page }) => {
  await openGame(page, 'test&seed=1&mode=sandbox');
  await page.evaluate(() => {
    const g = window.__game!;
    for (let i = 0; i < 30; i++)
      g.act('spawnEnemy', i % 4, -15 + (i % 6) * 6, -16 + Math.floor(i / 6) * 5);
    g.act('spawnProjectiles', 200);
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.__game!.resetStepTimes();
  });
  await page.waitForTimeout(3000);
  const stats = await page.evaluate(() => window.__game!.stepTimes());
  const enemies = await page.evaluate(
    () => (window.__game!.inspect() as { enemies: unknown[] }).enemies.length,
  );
  console.log(
    `30 enemies + 200 projectiles, step ms: avg ${stats.avg.toFixed(3)}, p95 ${stats.p95.toFixed(3)}, max ${stats.max.toFixed(3)} over ${stats.count} steps, ${enemies} enemies`,
  );
  expect(enemies).toBe(30);
  expect(stats.count).toBeGreaterThan(60);
  expect(stats.avg).toBeLessThanOrEqual(budget.maxAvgStepMs);
  expect(stats.p95).toBeLessThanOrEqual(budget.maxP95StepMs);
});
