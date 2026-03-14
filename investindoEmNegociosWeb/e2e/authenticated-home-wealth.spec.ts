import { test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';
import { DashboardPage } from './support/page-objects/dashboard.page';

test.describe('authenticated home wealth', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Advanced' });
  });

  test('dashboard avançado exibe patrimônio, contas e dívida oficial', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.goto();
    await dashboardPage.expectRealBalanceVisible();
    await dashboardPage.expectNetWorthVisible();
    await dashboardPage.expectAccountBalancesVisible();
    await dashboardPage.expectNetWorthHistoryVisible();
    await dashboardPage.expectDebtMapVisible();
  });

  test('dashboard abre painel de risco e mantém navegação por período', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.goto();
    await dashboardPage.openRiskDetails();
    await dashboardPage.expectRiskPanelVisible();
    await dashboardPage.closeRiskDetails();
    await dashboardPage.switchToQuarterly();
    await dashboardPage.switchToYearly();
  });
});
