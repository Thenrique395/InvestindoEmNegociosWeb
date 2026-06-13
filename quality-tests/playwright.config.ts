import { defineConfig, devices } from '@playwright/test';

delete process.env['FORCE_COLOR'];
delete process.env['NO_COLOR'];

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
    launchOptions: {
      ...(slowMo > 0 ? { slowMo } : {}),
      // Porta 5060 (backend DEV) é tratada como "unsafe port" (SIP) pelo Chrome.
      args: ['--explicitly-allowed-ports=5060']
    },
    trace: 'retain-on-failure'
  },
  webServer: shouldStartServer
    ? {
        command: 'env -u FORCE_COLOR -u NO_COLOR npm --prefix ../investindoEmNegociosWeb run start -- --host 127.0.0.1 --port 4300 --allowed-hosts all',
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
