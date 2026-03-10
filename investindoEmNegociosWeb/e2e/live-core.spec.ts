import { expect, test } from '@playwright/test';
import { AccountsPage } from './support/page-objects/accounts.page';
import { CardsPage } from './support/page-objects/cards.page';
import { DashboardPage } from './support/page-objects/dashboard.page';
import { GoalsPage } from './support/page-objects/goals.page';
import { completeLiveOnboarding } from './support/live-auth';

test.describe('live core flow', () => {
  test.skip(!process.env['RUN_LIVE_SERVER_E2E'], 'Live server E2E roda apenas sob demanda.');

  test('conclui onboarding real e entra no dashboard autenticado', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
  });

  test('cria um cartao real e exibe na listagem', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const last4 = user.email.match(/(\d+)/)?.[1]?.slice(-4) || '4242';
    const cardsPage = new CardsPage(page);

    await cardsPage.goto();
    await cardsPage.createCard(`Cartao Live ${last4}`, last4);
    await cardsPage.expectCardVisible(`Cartao Live ${last4}`, last4);
  });

  test('abre o dashboard real e alterna os paineis de periodo e risco', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.goto();
    await dashboardPage.expectRealBalanceVisible();
    await dashboardPage.expectNetWorthVisible();
    await dashboardPage.openRiskDetails();
    await dashboardPage.closeRiskDetails();
    await dashboardPage.switchToQuarterly();
    await dashboardPage.switchToYearly();
  });

  test('cria uma meta real e registra na listagem', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const goalName = `Meta Live ${suffix}`;
    const goalsPage = new GoalsPage(page);

    await goalsPage.goto();
    await goalsPage.createGoal(goalName);
    await goalsPage.expectGoalVisible(goalName);
  });

  test('exibe a conta principal real e respeita a restricao do plano Basic', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const accountsPage = new AccountsPage(page);

    await accountsPage.goto();
    await accountsPage.expectMainAccountVisible();
    await accountsPage.tryCreateBasicRestrictedAccount('Reserva bloqueada live', '300');
    await accountsPage.expectBasicRestrictionMessage();
    await accountsPage.expectMainAccountVisible();
    await accountsPage.expectAccountNotVisible('Reserva bloqueada live');
    await accountsPage.openMainAccountStatement();
    await accountsPage.expectStatementImportEngineVisible();
  });
});
