import { loadEnvConfig } from '@next/env';
import { defineConfig, devices } from '@playwright/test';

// Load .env.local (Clerk keys + E2E test-user creds) into the test process.
// .env.local pins NODE_ENV=production; force development so the spawned `next dev`
// webServer serves a dev Edge bundle (a production bundle disallows eval in
// middleware → "Code generation from strings disallowed").
loadEnvConfig(process.cwd());
process.env.NODE_ENV = "development";

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/e2e.spec.ts', '**/global.setup.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    // Run with Clerk enabled (real auth for the authenticated dashboard tests) and
    // force heuristic analysis so the analyze flow needs no OpenAI calls.
    command: 'DEV_FORCE_ANALYSIS_MODE=heuristic npm run dev',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: !process.env.CI,
  },
});
