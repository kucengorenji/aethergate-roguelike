import { expect, type Page, test } from '@playwright/test';
import { act, advance, advanceUntil, inspect, openGame, RUN } from './helpers';

// Players open the game without a mode; that is what shows the title.
const TITLE = 'test&seed=1&paused';

const frame = (page: Page) => page.evaluate(() => window.__game!.nextFrame());
const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    // Buttons by their action, inputs by id, radios by value.
    return el?.dataset.action || el?.id || (el as HTMLInputElement | null)?.value || null;
  });

/** Plays a few steps with the pointer locked, then loses the lock as Esc would. */
async function pauseByLosingLock(page: Page): Promise<void> {
  await advance(page, 5);
  await act(page, 'pointerLock', 0);
  await advance(page, 1);
}

/** Waits until IndexedDB holds `settings` (writes are asynchronous). */
async function waitForSavedSettings(page: Page, settings: Record<string, unknown>) {
  await page.waitForFunction(
    (expected) =>
      new Promise<boolean>((resolve) => {
        const req = indexedDB.open('aethergate', 1);
        req.onsuccess = () => {
          const get = req.result.transaction('save').objectStore('save').get('slot1');
          get.onsuccess = () => {
            const saved = (get.result as { settings?: Record<string, unknown> } | undefined)
              ?.settings;
            resolve(!!saved && Object.entries(expected).every(([k, v]) => saved[k] === v));
          };
        };
      }),
    settings,
  );
}

test('the title opens without a mode and Begin closes it', async ({ page }) => {
  await openGame(page, TITLE, { lock: false });
  expect((await inspect(page)).panel).toBe('title');
  await expect(page.locator('#menu h1')).toHaveText('Aethergate');
  await expect(page.locator('.vitals')).toBeHidden();
  await expect(page.locator('#lock-prompt')).toBeHidden();

  await page.getByRole('button', { name: 'Begin' }).click();
  await frame(page);
  const s = await inspect(page);
  expect(s.panel).toBeNull();
  expect(s.suspended).toBe(false);
  await expect(page.locator('#menu')).toBeHidden();
  await expect(page.locator('.vitals')).toBeVisible();
  await expect(page.locator('#lock-prompt')).toBeVisible();

  await openGame(page, RUN(), { lock: false });
  expect((await inspect(page)).panel).toBeNull();
  await expect(page.locator('#menu')).toBeHidden();
});

test('losing the pointer pauses the game and Resume continues', async ({ page }) => {
  await openGame(page, RUN());
  await pauseByLosingLock(page);
  let s = await inspect(page);
  expect(s.panel).toBe('pause');
  expect(s.suspended).toBe(true);
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
  const elapsed = s.elapsed;
  await advance(page, 30);
  expect((await inspect(page)).elapsed).toBe(elapsed);

  // Resume asks the browser for the pointer lock again; headless Chromium grants it.
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.waitForFunction(() => (window.__game!.inspect() as { locked: boolean }).locked);
  await advance(page, 10);
  s = await inspect(page);
  expect(s.panel).toBeNull();
  expect(s.suspended).toBe(false);
  expect(s.elapsed).toBeGreaterThan(elapsed);
  await expect(page.locator('#menu')).toBeHidden();
});

test('no pause before the first lock, while dead or while choosing', async ({ page }) => {
  await openGame(page, RUN(), { lock: false });
  await act(page, 'pointerLock', 0);
  await advance(page, 2);
  expect((await inspect(page)).panel).toBeNull();

  await act(page, 'pointerLock', 1);
  await act(page, 'setHealth', 0);
  await advanceUntil(page, (s) => s.phase === 'dead', 10);
  await act(page, 'pointerLock', 0);
  await advance(page, 2);
  expect((await inspect(page)).panel).toBeNull();

  await openGame(page, RUN());
  await act(page, 'offerBoons', 0);
  await advance(page, 1);
  await act(page, 'pointerLock', 0);
  await advance(page, 2);
  const s = await inspect(page);
  expect(s.choice).not.toBeNull();
  expect(s.panel).toBeNull();
  expect(s.suspended).toBe(false);
});

test('settings apply at once and survive a reload', async ({ page }) => {
  await openGame(page, TITLE, { lock: false });
  let s = await inspect(page);
  expect(s.render).toEqual({ pixelRatio: 1, shadows: true, shadowMapSize: 2048 });
  await page.getByRole('button', { name: 'Settings' }).click();
  await frame(page);

  const sensitivity = page.getByRole('slider', { name: 'Mouse sensitivity' });
  await sensitivity.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
  await expect(page.locator('#out-sensitivity')).toHaveText('120%');
  const volume = page.getByRole('slider', { name: 'Volume' });
  await volume.focus();
  await page.keyboard.press('Home');
  await expect(page.locator('#out-volume')).toHaveText('0%');
  await page.getByRole('radio', { name: 'Low' }).click();

  // Applied at once, without simulating a step.
  s = await inspect(page);
  expect(s.settings.sensitivity).toBeCloseTo(0.0022 * 1.2, 6);
  expect(s.settings.volume).toBe(0);
  expect(s.render).toEqual({ pixelRatio: 0.75, shadows: false, shadowMapSize: 2048 });
  expect(s.save.settings.quality).toBe('low');

  await waitForSavedSettings(page, { volume: 0, quality: 'low' });
  await openGame(page, TITLE, { lock: false });
  s = await inspect(page);
  expect(s.save.settings.sensitivity).toBeCloseTo(0.0022 * 1.2, 6);
  expect(s.save.settings).toMatchObject({ volume: 0, quality: 'low' });
  expect(s.settings.sensitivity).toBeCloseTo(0.0022 * 1.2, 6);
  expect(s.settings.volume).toBe(0);
  expect(s.render).toMatchObject({ pixelRatio: 0.75, shadows: false });

  await page.getByRole('button', { name: 'Settings' }).click();
  await frame(page);
  await expect(page.locator('#out-sensitivity')).toHaveText('120%');
  await expect(page.getByRole('radio', { name: 'Low' })).toBeChecked();
  await page.getByRole('radio', { name: 'Medium' }).click();
  expect((await inspect(page)).render).toEqual({
    pixelRatio: 1,
    shadows: true,
    shadowMapSize: 1024,
  });
  await page.getByRole('radio', { name: 'High' }).click();
  expect((await inspect(page)).render).toEqual({
    pixelRatio: 1,
    shadows: true,
    shadowMapSize: 2048,
  });
});

test('menus work with the keyboard', async ({ page }) => {
  await openGame(page, TITLE, { lock: false });
  expect(await focused(page)).toBe('begin');
  await page.keyboard.press('Tab');
  expect(await focused(page)).toBe('settings');
  await page.keyboard.press('Enter');
  await frame(page);
  expect((await inspect(page)).panel).toBe('settings');
  expect(await focused(page)).toBe('set-sensitivity');

  // Tab reaches the quality choice; arrows move it, like any radio group.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  expect(await focused(page)).toBe('high');
  await page.keyboard.press('ArrowLeft');
  let s = await inspect(page);
  expect(s.save.settings.quality).toBe('medium');
  expect(s.render.shadowMapSize).toBe(1024);

  await page.keyboard.press('Escape');
  await frame(page);
  expect((await inspect(page)).panel).toBe('title');
  expect(await focused(page)).toBe('begin');
  await page.keyboard.press('Enter');
  await frame(page);
  expect((await inspect(page)).panel).toBeNull();

  await openGame(page, RUN());
  await pauseByLosingLock(page);
  expect(await focused(page)).toBe('resume');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await frame(page);
  expect((await inspect(page)).panel).toBe('settings');
  await page.keyboard.press('Escape');
  await frame(page);
  s = await inspect(page);
  expect(s.panel).toBe('pause');
  expect(s.suspended).toBe(true);
  expect(await focused(page)).toBe('resume');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window.__game!.inspect() as { locked: boolean }).locked);
  s = await inspect(page);
  expect(s.panel).toBeNull();
  expect(s.suspended).toBe(false);
});

// Visual baselines. The mouse is parked in a corner so no control shows a hover state.
test('title screen', async ({ page }) => {
  await openGame(page, TITLE, { lock: false });
  await advance(page, 30);
  await expect(page).toHaveScreenshot('title.png');
});

test('pause menu', async ({ page }) => {
  await openGame(page, RUN());
  await pauseByLosingLock(page);
  await frame(page);
  await expect(page).toHaveScreenshot('pause.png');
});

test('settings panel', async ({ page }) => {
  await openGame(page, RUN());
  await pauseByLosingLock(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.mouse.move(1, 1);
  await frame(page);
  await expect(page).toHaveScreenshot('settings.png');
});
