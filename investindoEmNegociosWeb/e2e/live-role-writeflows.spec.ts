import { expect, test } from '@playwright/test';
import { AdminUsersPage } from './support/page-objects/admin-users.page';
import { CategoriesPage } from './support/page-objects/categories.page';
import { ExpensesPage } from './support/page-objects/expenses.page';
import { InvestmentsPage } from './support/page-objects/investments.page';
import { getSeededLiveCredential, loginWithSeededProfile } from './support/live-auth';

const LIVE_API_BASE_URL = 'http://35.174.50.187:5059/api/v1';

test.describe('live role write flows', () => {
  test.skip(!process.env['RUN_LIVE_SERVER_E2E'], 'Live server E2E roda apenas sob demanda.');

  test('Intermediate cria categoria real e a usa no fluxo de importação de fatura', async ({ page }) => {
    test.setTimeout(120000);
    test.skip(!getSeededLiveCredential('intermediate'), 'Credenciais Intermediate nao configuradas.');

    await loginWithSeededProfile(page, 'intermediate');
    const suffix = `${Date.now()}`.slice(-6);
    const categoryName = `Fatura Role ${suffix}`;
    const categoriesPage = new CategoriesPage(page);
    const expensesPage = new ExpensesPage(page);

    await categoriesPage.goto();
    await categoriesPage.createCategory(categoryName, 'Expense');

    await expensesPage.goto();
    await expensesPage.openInvoiceImport();
    await expensesPage.selectDefaultInvoiceCategory(categoryName);
    await expensesPage.expectInvoiceImportDisabled();
  });

  test('Advanced cria um lançamento real em investimentos', async ({ page }) => {
    test.setTimeout(120000);
    test.skip(!getSeededLiveCredential('advanced'), 'Credenciais Advanced nao configuradas.');

    await loginWithSeededProfile(page, 'advanced');
    const suffix = `${Date.now()}`.slice(-6);
    const assetName = `TESOURO LIVE ${suffix}`;
    const investmentsPage = new InvestmentsPage(page);

    await investmentsPage.goto();
    await investmentsPage.createPosition(assetName);

    const accessToken = await page.evaluate(() => window.localStorage.getItem('access_token'));
    expect(accessToken).toBeTruthy();
    const positionsResponse = await fetch(`${LIVE_API_BASE_URL}/investments/positions`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    expect(positionsResponse.ok).toBeTruthy();
    const positions = await positionsResponse.json() as Array<{ asset?: string }>;
    expect(positions.some((position) => position.asset === assetName)).toBeTruthy();
  });

  test('Admin altera o role de um usuário real e restaura no fim do fluxo', async ({ page }) => {
    test.setTimeout(120000);
    test.skip(!getSeededLiveCredential('admin'), 'Credenciais Admin nao configuradas.');

    await loginWithSeededProfile(page, 'admin');
    const adminUsersPage = new AdminUsersPage(page);

    await adminUsersPage.goto();
    await adminUsersPage.expectRole('codex.intermediate.live@example.com', 'Intermediate');

    try {
      await adminUsersPage.changeRole('codex.intermediate.live@example.com', 'Advanced');
      await adminUsersPage.expectRole('codex.intermediate.live@example.com', 'Advanced');
    } finally {
      const roleSelect = adminUsersPage.rowByEmail('codex.intermediate.live@example.com').locator('select').first();
      const currentValue = await roleSelect.inputValue().catch(() => '');
      if (currentValue !== 'Intermediate') {
        await adminUsersPage.changeRole('codex.intermediate.live@example.com', 'Intermediate');
        await adminUsersPage.expectRole('codex.intermediate.live@example.com', 'Intermediate');
      }
    }
  });
});
