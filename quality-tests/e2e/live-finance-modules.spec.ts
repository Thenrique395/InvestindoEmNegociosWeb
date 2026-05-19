import { expect, test } from '@playwright/test';
import { LoansPage } from './support/page-objects/loans.page';
import { MonthlySnapshotsPage } from './support/page-objects/monthly-snapshots.page';
import { SecurityPage } from './support/page-objects/security.page';
import { SubscriptionsPage } from './support/page-objects/subscriptions.page';
import { completeLiveOnboarding } from './support/live-auth';
import { liveApi, liveEndpointAvailable } from './support/live-api';

test.describe('live finance modules', () => {
  test.skip(!process.env['RUN_LIVE_SERVER_E2E'], 'Live server E2E roda apenas sob demanda.');

  test('cria um empréstimo real e persiste o contrato', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    test.skip(!(await liveEndpointAvailable('/loans')), 'Servidor remoto ainda não publicou o módulo de empréstimos.');
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const title = `Emprestimo Live ${suffix}`;
    const loansPage = new LoansPage(page);

    await loansPage.goto();
    await loansPage.simulate(title);
    await loansPage.expectSimulationVisible();
    await loansPage.createContract(title);
    await loansPage.expectContractVisible(title);

    await expect.poll(async () => {
      const loans = await liveApi<Array<{ title: string }>>(page, '/loans');
      return loans.some((item) => item.title === title);
    }, { timeout: 15000 }).toBeTruthy();
  });

  test('gera um snapshot real do mês e exibe na listagem', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    test.skip(!(await liveEndpointAvailable('/monthlysnapshots')), 'Servidor remoto ainda não publicou o módulo de snapshots.');
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const snapshotsPage = new MonthlySnapshotsPage(page);
    const now = new Date();
    const label = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    await snapshotsPage.goto();
    await snapshotsPage.generateCurrentMonth();
    await snapshotsPage.expectSnapshotVisible(label);

    await expect.poll(async () => {
      const snapshots = await liveApi<Array<{ snapshotLabel: string }>>(page, '/monthlysnapshots');
      return snapshots.some((item) => item.snapshotLabel === label);
    }, { timeout: 15000 }).toBeTruthy();
  });

  test('troca o plano real para Intermediate anual e depois cancela a renovação', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    test.skip(!(await liveEndpointAvailable('/subscriptions')), 'Servidor remoto ainda não publicou o módulo de assinaturas.');
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const subscriptionsPage = new SubscriptionsPage(page);

    await subscriptionsPage.goto();
    await subscriptionsPage.switchToYearly();
    await subscriptionsPage.changeTo('Intermediate');
    await subscriptionsPage.expectCurrentPlan('Intermediate');

    await expect.poll(async () => {
      const catalog = await liveApi<{ current: { planCode: string; role: string; billingCycle: string } }>(page, '/subscriptions');
      return `${catalog.current.planCode}|${catalog.current.role}|${catalog.current.billingCycle}`;
    }, { timeout: 20000 }).toBe('intermediate|Intermediate|Yearly');

    await subscriptionsPage.cancelRenewal();
    await subscriptionsPage.expectAutoRenewStatus('Cancelada');

    await expect.poll(async () => {
      const catalog = await liveApi<{ current: { status: string; autoRenew: boolean; role: string } }>(page, '/subscriptions');
      return `${catalog.current.status}|${catalog.current.autoRenew}|${catalog.current.role}`;
    }, { timeout: 20000 }).toBe('Cancelled|false|Basic');
  });

  test('revoga sessões reais e atualiza o resumo de segurança', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    test.skip(!(await liveEndpointAvailable('/preferences/security-summary')), 'Servidor remoto ainda não publicou o resumo de segurança.');
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const securityPage = new SecurityPage(page);

    await securityPage.goto();
    await securityPage.expectSummaryLoaded();
    await securityPage.expectActiveSessionsCount('1');
    await securityPage.revokeSessions();

    await expect.poll(async () => {
      const summary = await liveApi<{ activeSessions: number }>(page, '/preferences/security-summary');
      return summary.activeSessions;
    }, { timeout: 15000 }).toBe(0);

    await securityPage.expectActiveSessionsCount('0');
  });
});
