import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { openGame } from './helpers';

const budget = (
  JSON.parse(readFileSync('perf-budget.json', 'utf8')) as {
    frame: { maxAvgStepMs: number; maxP95StepMs: number };
  }
).frame;

// Measures CPU time of the simulation step (systems + physics). GPU time in a
// headless browser says nothing about player hardware, so it is not budgeted here;
// check it manually with the debug overlay on target devices.
test('simulation step stays within the CPU budget', async ({ page }) => {
  await openGame(page, 'test&seed=1');
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.__game!.resetStepTimes();
  });
  await page.waitForTimeout(3000);
  await page.keyboard.up('ArrowUp');
  const stats = await page.evaluate(() => window.__game!.stepTimes());
  console.log(
    `step ms: avg ${stats.avg.toFixed(3)}, p95 ${stats.p95.toFixed(3)}, max ${stats.max.toFixed(3)} over ${stats.count} steps`,
  );
  expect(stats.count).toBeGreaterThan(60);
  expect(stats.avg).toBeLessThanOrEqual(budget.maxAvgStepMs);
  expect(stats.p95).toBeLessThanOrEqual(budget.maxP95StepMs);
});
