import { defineConfig, devices } from '@playwright/test';

const appBaseUrl = process.env['APP_BASE_URL'] || 'http://127.0.0.1:4300';
const shouldStartServer = !process.env['APP_BASE_URL'];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 1,
  retries: process.env['CI'] ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: appBaseUrl,
    trace: 'retain-on-failure'
  },
  webServer: shouldStartServer
    ? {
        command: 'npm --prefix ../investindoEmNegociosWeb run start -- --host 127.0.0.1 --port 4300 --allowed-hosts all',
        url: appBaseUrl,
        reuseExistingServer: !process.env['CI'],
        timeout: 120000
      }
    : undefined,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
