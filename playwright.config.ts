import { defineConfig, devices } from '@playwright/test';

// Dedicated port so e2e runs never collide with a dev server on 3000.
const PORT = 3100;
const API_PORT = 4000;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // D4: seed the database, start the API, then Next.js (which forwards /api to it).
  webServer: [
    {
      command: `yarn seed && SERVER_PORT=${API_PORT} yarn dev:server`,
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `yarn dev --port ${PORT}`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      env: { API_URL: `http://localhost:${API_PORT}`, APP_URL: `http://localhost:${PORT}` },
    },
  ],
});
