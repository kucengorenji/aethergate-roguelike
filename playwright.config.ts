import { defineConfig, devices } from '@playwright/test';

// Parallel checkouts (git worktrees) set their own port, or they would reuse each other's server.
const PORT = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  // Each worker drives a software-rendered (SwiftShader) browser that uses several
  // cores. Measured on 12 cores: 3, 4 and 6 workers all take about 2.3 minutes in
  // total, but more workers make every test slower and push long scenarios toward
  // the timeout. Three keeps headroom without costing wall time.
  workers: 3,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'line' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 720 },
    trace: 'retain-on-failure',
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  projects: [
    {
      name: 'e2e',
      testIgnore: /perf\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'perf',
      testMatch: /perf\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Tests run against the production build so they see what players see.
    command: `pnpm vite build --logLevel warn && pnpm vite preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
