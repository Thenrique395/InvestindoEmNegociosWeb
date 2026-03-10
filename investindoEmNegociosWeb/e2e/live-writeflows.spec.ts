import { expect, test } from '@playwright/test';
import { CardsPage } from './support/page-objects/cards.page';
import { CategoriesPage } from './support/page-objects/categories.page';
import { completeLiveOnboarding } from './support/live-auth';
import { ExpensesPage } from './support/page-objects/expenses.page';
import { IncomesPage } from './support/page-objects/incomes.page';

test.describe('live write flow', () => {
  test.skip(!process.env['RUN_LIVE_SERVER_E2E'], 'Live server E2E roda apenas sob demanda.');

  test('cria categoria de despesa real, lanca despesa e marca como pago', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const categoryName = `Despesa Live ${suffix}`;
    const expenseName = `Mercado Real ${suffix}`;
    const categoriesPage = new CategoriesPage(page);
    const expensesPage = new ExpensesPage(page);

    await categoriesPage.goto();
    await categoriesPage.createCategory(categoryName, 'Expense');
    await expensesPage.goto();
    await expensesPage.openCreateModal();
    await expensesPage.createExpense(expenseName, categoryName, '12550');
    await expensesPage.reloadAndExpectRow(expenseName);
    await expensesPage.expectStatus(expenseName, 'Pendente');
    await expensesPage.markAsPaid(expenseName);
    await expensesPage.reloadAndExpectRow(expenseName);
    await expensesPage.expectStatus(expenseName, 'Pago');
  });

  test('cria categoria de receita real, lanca receita e marca como recebida', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const categoryName = `Receita Live ${suffix}`;
    const incomeName = `Freela Real ${suffix}`;
    const categoriesPage = new CategoriesPage(page);
    const incomesPage = new IncomesPage(page);

    await categoriesPage.goto();
    await categoriesPage.createCategory(categoryName, 'Income');
    await incomesPage.goto();
    await incomesPage.openCreateModal();
    await incomesPage.createIncome(incomeName, categoryName, '240000');
    await incomesPage.reloadAndExpectRow(incomeName);
    await incomesPage.expectStatus(incomeName, 'Pendente');
    await incomesPage.markAsReceived(incomeName);
    await incomesPage.reloadAndExpectRow(incomeName);
    await incomesPage.expectStatus(incomeName, 'Recebido');
  });

  test('cria categoria e remove a categoria personalizada real', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const categoryName = `Excluir Live ${suffix}`;
    const categoriesPage = new CategoriesPage(page);

    await categoriesPage.goto();
    await categoriesPage.createCategory(categoryName, 'Expense');
    await categoriesPage.removeCategory(categoryName);
    await categoriesPage.expectCategoryAbsent(categoryName);
  });

  test('cria receita recorrente real e filtra por tipo recorrente', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const categoryName = `Recorrente Live ${suffix}`;
    const incomeName = `Mensalidade Real ${suffix}`;
    const categoriesPage = new CategoriesPage(page);
    const incomesPage = new IncomesPage(page);

    await categoriesPage.goto();
    await categoriesPage.createCategory(categoryName, 'Income');
    await incomesPage.goto();
    await incomesPage.openCreateModal();
    await incomesPage.createIncome(incomeName, categoryName, '325000', true);
    await incomesPage.reloadAndExpectRow(incomeName);
    await expect(incomesPage.rowByName(incomeName).getByRole('cell', { name: 'Recorrente', exact: true })).toBeVisible();
    await incomesPage.filterRecurring();
    await expect(incomesPage.rowByName(incomeName)).toBeVisible({ timeout: 20000 });
    await expect(page.locator('tr').filter({ hasText: 'Salario teste live' })).toHaveCount(0);
  });

  test('edita despesa real em aberto e reflete novo valor', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const categoryName = `Editar Desp ${suffix}`;
    const expenseName = `Conta Luz ${suffix}`;
    const updatedName = `Conta Luz Ajustada ${suffix}`;
    const categoriesPage = new CategoriesPage(page);
    const expensesPage = new ExpensesPage(page);

    await categoriesPage.goto();
    await categoriesPage.createCategory(categoryName, 'Expense');
    await expensesPage.goto();
    await expensesPage.openCreateModal();
    await expensesPage.createExpense(expenseName, categoryName, '8800');
    await expensesPage.reloadAndExpectRow(expenseName);
    await expensesPage.openEdit(expenseName);
    await expensesPage.saveExpenseEdit(updatedName, '9900');
    await expensesPage.reloadAndExpectRow(updatedName);
    await expect(expensesPage.rowByName(updatedName).getByText('R$ 99,00')).toBeVisible();
  });

  test('edita e exclui receita recorrente real', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const categoryName = `Gerir Rec ${suffix}`;
    const incomeName = `Assinatura SaaS ${suffix}`;
    const updatedName = `Assinatura SaaS Ajustada ${suffix}`;
    const categoriesPage = new CategoriesPage(page);
    const incomesPage = new IncomesPage(page);

    await categoriesPage.goto();
    await categoriesPage.createCategory(categoryName, 'Income');
    await incomesPage.goto();
    await incomesPage.openCreateModal();
    await incomesPage.createIncome(incomeName, categoryName, '450000', true);
    await incomesPage.reloadAndExpectRow(incomeName);
    await incomesPage.openEdit(incomeName);
    await incomesPage.saveIncomeEdit(updatedName, '470000');
    await incomesPage.reloadAndExpectRow(updatedName);
    await expect(incomesPage.rowByName(updatedName).getByText('R$ 4.700,00')).toBeVisible();
    await incomesPage.deleteIncome(updatedName);
    await page.waitForTimeout(2500);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(incomesPage.rowByName(updatedName)).toHaveCount(0);
  });

  test('tenta estornar pagamento real e preserva a despesa como paga quando o servidor rejeita', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const categoryName = `Historico Desp ${suffix}`;
    const expenseName = `Energia Casa ${suffix}`;
    const categoriesPage = new CategoriesPage(page);
    const expensesPage = new ExpensesPage(page);

    await categoriesPage.goto();
    await categoriesPage.createCategory(categoryName, 'Expense');
    await expensesPage.goto();
    await expensesPage.openCreateModal();
    await expensesPage.createExpense(expenseName, categoryName, '12990');
    await expensesPage.reloadAndExpectRow(expenseName);
    await expensesPage.markAsPaid(expenseName);
    await expensesPage.openHistory(expenseName);
    await expensesPage.tryReversePaymentExpectRejection();
    await page.waitForTimeout(2500);
    await expensesPage.closeHistoryModal();
    await expensesPage.reloadAndExpectRow(expenseName);
    await expensesPage.expectStatus(expenseName, 'Pago');
  });

  test('exclui receita real avulsa pela confirmacao simples', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const categoryName = `Excluir Rec ${suffix}`;
    const incomeName = `Bônus Avulso ${suffix}`;
    const categoriesPage = new CategoriesPage(page);
    const incomesPage = new IncomesPage(page);

    await categoriesPage.goto();
    await categoriesPage.createCategory(categoryName, 'Income');
    await incomesPage.goto();
    await incomesPage.openCreateModal();
    await incomesPage.createIncome(incomeName, categoryName, '175000');
    await incomesPage.reloadAndExpectRow(incomeName);
    await incomesPage.deleteIncome(incomeName);
    await page.waitForTimeout(2500);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(incomesPage.rowByName(incomeName)).toHaveCount(0);
  });
});
