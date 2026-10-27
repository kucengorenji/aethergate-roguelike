import { expect, test } from '@playwright/test';
import { act, advance, advanceUntil, DUMMY_CHEST, hold, inspect, openGame } from './helpers';

// The rigged sorcerer (default) and the procedural mannequin (?model=mannequin)
// must drive the same clips and layers, so game systems keep their meaning.
for (const model of ['sorcerer', 'mannequin'] as const) {
  const query = `test&seed=1&paused&mode=training${model === 'mannequin' ? '&model=mannequin' : ''}`;

  test(`${model}: loads before the first frame and stands idle`, async ({ page }) => {
    await openGame(page, query);
    const s = await inspect(page);
    expect(s.model).toBe(model);
    expect(s.animation).toBe('idle');
    expect(s.layers).toEqual({ aim: 0, bash: 0, drink: 0 });
  });

  test(`${model}: base clips follow movement and the dodge`, async ({ page }) => {
    await openGame(page, query);
    await hold(page, 'KeyW', 20);
    expect((await inspect(page)).animation).toBe('run');
    await advanceUntil(page, (s) => s.animation === 'idle', 60);

    await page.keyboard.press('Space');
    await advance(page, 2);
    expect((await inspect(page)).animation).toBe('dodge');
    await advanceUntil(page, (s) => s.animation === 'idle', 60);
  });

  test(`${model}: upper-body layers follow aiming, bash and flask`, async ({ page }) => {
    await openGame(page, query);
    await act(page, 'aimAt', ...DUMMY_CHEST);
    await page.mouse.down();
    // Bolts hitting the dummy cause hitstop, which slows the fade, so wait for it.
    await advanceUntil(page, (s) => s.layers.aim > 0.9, 30);
    await page.mouse.up();
    await advanceUntil(page, (s) => s.layers.aim === 0, 60);

    await page.keyboard.press('KeyF');
    await advance(page, 3);
    expect((await inspect(page)).layers.bash).toBeGreaterThan(0.9);
    await advanceUntil(page, (s) => s.action === 'none', 60);

    await act(page, 'setHealth', 50);
    await page.keyboard.press('KeyQ');
    await advance(page, 3);
    expect((await inspect(page)).layers.drink).toBeGreaterThan(0.9);
  });
}
