import { defineConfig, devices } from '@playwright/test';

const appBaseUrl = process.env['APP_BASE_URL'] || 'http://127.0.0.1:4300';
const shouldStartServer = !process.env['APP_BASE_URL'];
const slowMo = Number(process.env['E2E_SLOWMO_MS'] || 0);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 1,
  retries: process.env['CI'] ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: appBaseUrl,
    launchOptions: slowMo > 0 ? { slowMo } : undefined,
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
