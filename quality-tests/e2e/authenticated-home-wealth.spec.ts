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

  test('dashboard avançado exibe saúde financeira e dívidas/contas', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.goto();
    await dashboardPage.expectHealthVisible();
    await dashboardPage.expectDebtMapVisible();
  });

  test('dashboard avançado mantém blocos rebrandados sem overflow', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    for (const viewport of [
      { width: 1440, height: 1200 },
      { width: 390, height: 900 }
    ]) {
      await page.setViewportSize(viewport);
      await dashboardPage.goto();
      await dashboardPage.expectInvestmentsVisible();
      await dashboardPage.expectDebtMapVisible();
      await dashboardPage.expectHealthVisible();
      await dashboardPage.expectNoHorizontalOverflow();
    }
  });
});
