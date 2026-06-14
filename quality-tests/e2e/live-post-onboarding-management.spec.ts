import { expect, test } from '@playwright/test';
import { completeLiveOnboarding } from './support/live-auth';
import { ExpensesPage } from './support/page-objects/expenses.page';
import { IncomesPage } from './support/page-objects/incomes.page';
import {
  DEFAULT_EXPENSE_CATEGORY,
  DEFAULT_INCOME_CATEGORY,
  REFRESH_THROTTLE_MS,
  todayAsDDMMYYYY,
} from './support/post-onboarding-helpers';

test.describe('live post-onboarding management flow', () => {
  test.skip(!process.env['RUN_LIVE_SERVER_E2E'], 'Live server E2E roda apenas sob demanda.');

  test('cadastra despesa adicional depois do onboarding e marca como paga', async ({ page }, testInfo) => {
    test.setTimeout(150000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const expenseName = `Plano Celular ${suffix}`;
    const expensesPage = new ExpensesPage(page);

    const dueDate = todayAsDDMMYYYY();

    await expensesPage.goto();
    await page.waitForTimeout(REFRESH_THROTTLE_MS);
    await expensesPage.openCreateModal();
    await expensesPage.createExpense(expenseName, DEFAULT_EXPENSE_CATEGORY, '5990', dueDate);
    await expensesPage.reloadAndExpectRow(expenseName);
    await expensesPage.expectStatus(expenseName, 'Pendente');

    await expensesPage.markAsPaid(expenseName);
    await expensesPage.reloadAndExpectRow(expenseName);
    await expensesPage.expectStatus(expenseName, 'Pago');
  });

  test('cadastra despesa adicional depois do onboarding e edita o valor', async ({ page }, testInfo) => {
    test.setTimeout(150000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const expenseName = `Manutenção Carro ${suffix}`;
    const updatedName = `Manutenção Carro Ajustada ${suffix}`;
    const expensesPage = new ExpensesPage(page);

    const dueDate = todayAsDDMMYYYY();

    await expensesPage.goto();
    await page.waitForTimeout(REFRESH_THROTTLE_MS);
    await expensesPage.openCreateModal();
    await expensesPage.createExpense(expenseName, DEFAULT_EXPENSE_CATEGORY, '22000', dueDate);
    await expensesPage.reloadAndExpectRow(expenseName);

    await page.waitForTimeout(REFRESH_THROTTLE_MS);
    await expensesPage.openEdit(expenseName);
    await expensesPage.saveExpenseEdit(updatedName, '25000');
    await expensesPage.reloadAndExpectRow(updatedName);
    await expect(expensesPage.rowByName(updatedName).getByText('R$ 250,00')).toBeVisible();
  });

  test('cadastra receita recorrente adicional depois do onboarding e filtra por tipo recorrente', async ({ page }, testInfo) => {
    test.setTimeout(150000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const incomeName = `Consultoria Mensal ${suffix}`;
    const incomesPage = new IncomesPage(page);

    const receivedDate = todayAsDDMMYYYY();

    await incomesPage.goto();
    await page.waitForTimeout(REFRESH_THROTTLE_MS);
    await incomesPage.openCreateModal();
    await incomesPage.createIncome(incomeName, DEFAULT_INCOME_CATEGORY, '350000', true, receivedDate);
    await incomesPage.reloadAndExpectRow(incomeName);
    await expect(incomesPage.rowByName(incomeName).getByRole('cell', { name: 'Recorrente', exact: true })).toBeVisible();

    await incomesPage.filterRecurring();
    await expect(incomesPage.rowByName(incomeName)).toBeVisible({ timeout: 20000 });
  });

  test('cadastra receita avulsa adicional depois do onboarding e a exclui', async ({ page }, testInfo) => {
    test.setTimeout(150000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const incomeName = `Reembolso Avulso ${suffix}`;
    const incomesPage = new IncomesPage(page);

    const receivedDate = todayAsDDMMYYYY();

    await incomesPage.goto();
    await page.waitForTimeout(REFRESH_THROTTLE_MS);
    await incomesPage.openCreateModal();
    await incomesPage.createIncome(incomeName, DEFAULT_INCOME_CATEGORY, '60000', false, receivedDate);
    await incomesPage.reloadAndExpectRow(incomeName);

    await page.waitForTimeout(REFRESH_THROTTLE_MS);
    await incomesPage.deleteIncome(incomeName);
    await expect(incomesPage.rowByName(incomeName)).toHaveCount(0, { timeout: 20000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(incomesPage.rowByName(incomeName)).toHaveCount(0);
  });

  test('cadastra despesa adicional depois do onboarding e a exclui', async ({ page }, testInfo) => {
    test.setTimeout(150000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const expenseName = `Assinatura Streaming ${suffix}`;
    const expensesPage = new ExpensesPage(page);

    const dueDate = todayAsDDMMYYYY();

    await expensesPage.goto();
    await page.waitForTimeout(REFRESH_THROTTLE_MS);
    await expensesPage.openCreateModal();
    await expensesPage.createExpense(expenseName, DEFAULT_EXPENSE_CATEGORY, '3990', dueDate);
    await expensesPage.reloadAndExpectRow(expenseName);

    await page.waitForTimeout(REFRESH_THROTTLE_MS);
    await expensesPage.deleteExpense(expenseName);
    await expect(expensesPage.rowByName(expenseName)).toHaveCount(0, { timeout: 20000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(expensesPage.rowByName(expenseName)).toHaveCount(0);
  });
});
