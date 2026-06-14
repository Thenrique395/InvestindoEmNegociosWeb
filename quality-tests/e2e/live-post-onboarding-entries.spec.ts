import { test } from '@playwright/test';
import { completeLiveOnboarding } from './support/live-auth';
import { ExpensesPage } from './support/page-objects/expenses.page';
import { IncomesPage } from './support/page-objects/incomes.page';
import {
  DEFAULT_EXPENSE_CATEGORY,
  DEFAULT_INCOME_CATEGORY,
  REFRESH_THROTTLE_MS,
  todayAsDDMMYYYY,
} from './support/post-onboarding-helpers';

test.describe('live post-onboarding entries flow', () => {
  test.skip(!process.env['RUN_LIVE_SERVER_E2E'], 'Live server E2E roda apenas sob demanda.');

  test('cria conta, conclui onboarding e cadastra despesas adicionais depois', async ({ page }, testInfo) => {
    test.setTimeout(150000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const firstExpenseName = `Internet Casa ${suffix}`;
    const secondExpenseName = `Academia ${suffix}`;
    const expensesPage = new ExpensesPage(page);

    const dueDate = todayAsDDMMYYYY();

    await expensesPage.goto();
    await page.waitForTimeout(REFRESH_THROTTLE_MS);
    await expensesPage.openCreateModal();
    await expensesPage.createExpense(firstExpenseName, DEFAULT_EXPENSE_CATEGORY, '9990', dueDate);
    await expensesPage.reloadAndExpectRow(firstExpenseName);
    await expensesPage.expectStatus(firstExpenseName, 'Pendente');

    await page.waitForTimeout(REFRESH_THROTTLE_MS);
    await expensesPage.openCreateModal();
    await expensesPage.createExpense(secondExpenseName, DEFAULT_EXPENSE_CATEGORY, '15000', dueDate);
    await expensesPage.reloadAndExpectRow(secondExpenseName);
    await expensesPage.expectStatus(secondExpenseName, 'Pendente');
  });

  test('cria conta, conclui onboarding e cadastra despesa e receita adicionais depois', async ({ page }, testInfo) => {
    test.setTimeout(150000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const expenseName = `Assinatura Streaming ${suffix}`;
    const incomeName = `Bico Freelance ${suffix}`;
    const expensesPage = new ExpensesPage(page);
    const incomesPage = new IncomesPage(page);

    const entryDate = todayAsDDMMYYYY();

    await expensesPage.goto();
    await page.waitForTimeout(REFRESH_THROTTLE_MS);
    await expensesPage.openCreateModal();
    await expensesPage.createExpense(expenseName, DEFAULT_EXPENSE_CATEGORY, '4990', entryDate);
    await expensesPage.reloadAndExpectRow(expenseName);
    await expensesPage.expectStatus(expenseName, 'Pendente');

    await incomesPage.goto();
    await page.waitForTimeout(REFRESH_THROTTLE_MS);
    await incomesPage.openCreateModal();
    await incomesPage.createIncome(incomeName, DEFAULT_INCOME_CATEGORY, '80000', false, entryDate);
    await incomesPage.reloadAndExpectRow(incomeName);
    await incomesPage.expectStatus(incomeName, 'Pendente');
  });
});
