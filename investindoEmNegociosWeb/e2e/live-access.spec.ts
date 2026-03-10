import { expect, test } from '@playwright/test';
import { DashboardPage } from './support/page-objects/dashboard.page';
import { IncomesPage } from './support/page-objects/incomes.page';
import { completeLiveOnboarding } from './support/live-auth';
import { CategoriesPage } from './support/page-objects/categories.page';
import { ExpensesPage } from './support/page-objects/expenses.page';

test.describe('live access flow', () => {
  test.skip(!process.env['RUN_LIVE_SERVER_E2E'], 'Live server E2E roda apenas sob demanda.');

  test('abre a receita real e evidencia ausencia de categorias ativas', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const incomesPage = new IncomesPage(page);

    await incomesPage.goto();
    await incomesPage.openCreateModal();
    await incomesPage.createForm().getByRole('textbox', { name: 'Fonte', exact: true }).fill('Freela live sem categoria');
    await incomesPage.expectNoActiveCategories();
  });

  test('abre a despesa real e evidencia ausencia de categorias ativas', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const expensesPage = new ExpensesPage(page);

    await expensesPage.goto();
    await expensesPage.expectLoaded();
    await expensesPage.openCreateModal();
    await expensesPage.createForm().getByLabel('Nome da despesa').fill('Despesa live sem categoria');
    await expensesPage.expectNoActiveCategories();
  });

  test('abre categorias por rota direta para usuario Basic', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-5) || 'live';
    const categoryName = `Categoria Live ${suffix}`;
    const categoriesPage = new CategoriesPage(page);

    await categoriesPage.goto();
    await categoriesPage.createCategory(categoryName, 'Expense');
    await expect(page.getByText(categoryName)).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Categoria personalizada')).toBeVisible();
  });

  test('redireciona usuario Basic ao tentar abrir calendario', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const dashboardPage = new DashboardPage(page);

    await page.goto('/calendario', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard$/i, { timeout: 20000 });
    await dashboardPage.expectLoaded();
  });

  test('redireciona usuario Basic ao tentar abrir investimentos', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const dashboardPage = new DashboardPage(page);

    await page.goto('/investimentos', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard$/i, { timeout: 20000 });
    await dashboardPage.expectRealBalanceVisible();
  });

  test('redireciona usuario Basic ao tentar abrir admin parametros', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const dashboardPage = new DashboardPage(page);

    await page.goto('/admin/parametros', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard$/i, { timeout: 20000 });
    await dashboardPage.expectNetWorthVisible();
  });
});
