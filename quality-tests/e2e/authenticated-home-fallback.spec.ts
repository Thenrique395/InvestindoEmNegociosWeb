import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';
import { DashboardPage } from './support/page-objects/dashboard.page';

test.describe('authenticated home fallback', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page, {
      role: 'Advanced',
      apiFailures: [
        { path: '/api/v1/accounts/summary/real-balance', method: 'GET', status: 500 },
        { path: '/api/v1/accounts/summary/debts', method: 'GET', status: 500 },
        { path: '/api/v1/accounts/summary/net-worth', method: 'GET', status: 500 },
        { path: '/api/v1/accounts/summary/net-worth/history', method: 'GET', status: 500 },
        { path: '/api/v1/accounts/summary/projection', method: 'GET', status: 500 },
        { path: '/api/v1/accounts/summary/risk', method: 'GET', status: 500 },
        { path: '/api/v1/accounts/summary/insights', method: 'GET', status: 500 },
        { path: '/api/v1/accounts/summary/recommendations', method: 'GET', status: 500 }
      ]
    });
  });

  test('home mantém visão patrimonial local mesmo com resumos oficiais indisponíveis', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.goto();
    await dashboardPage.expectRealBalanceVisible();
    await dashboardPage.expectNetWorthVisible();
    await dashboardPage.expectAccountBalancesVisible();
    await expect(page.getByText('Mapa de dívidas')).toHaveCount(0);
  });

  test('home segue utilizável (saldo e patrimônio locais) mesmo em fallback', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.goto();
    await dashboardPage.expectRealBalanceVisible();
    await dashboardPage.expectNetWorthVisible();
  });
});
