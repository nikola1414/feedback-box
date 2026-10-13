import { defineConfig } from '@playwright/test';

const PORT = 8097;
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgres://feedbackbox:feedbackbox@localhost:5432/feedbackbox_test';

export default defineConfig({
  testDir: './tests',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Use a preinstalled Chromium when CHROMIUM_PATH is set; otherwise Playwright's own download.
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: {
    // Wipes the test database, then starts the real server (which re-seeds the demo data).
    command: 'node reset-db.mjs && node ../backend/src/server.js',
    url: `http://localhost:${PORT}/api/stats`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: { DATABASE_URL, PORT: String(PORT), SEED_DEMO: 'true' },
  },
});
