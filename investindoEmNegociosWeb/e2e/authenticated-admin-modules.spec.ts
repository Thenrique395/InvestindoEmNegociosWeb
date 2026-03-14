import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';
import { AdminParametersPage } from './support/page-objects/admin-parameters.page';
import { AdminRobotsPage } from './support/page-objects/admin-robots.page';

test.describe('authenticated admin modules', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Admin' });
  });

  test('admin salva regras globais e mantém persistência após recarga', async ({ page }) => {
    const adminParametersPage = new AdminParametersPage(page);

    await adminParametersPage.goto();
    await adminParametersPage.expectScalabilitySectionVisible();
    const notificationResult = await adminParametersPage.saveNotificationDays('5');
    expect(notificationResult.incomeDaysBefore).toBe(5);
  });

  test('admin salva agendamento dos robôs e mantém persistência após recarga', async ({ page }) => {
    const adminParametersPage = new AdminParametersPage(page);

    await adminParametersPage.goto();
    const robotResult = await adminParametersPage.saveRobotSchedule('09:30');
    expect(robotResult.dailyRunTimeUtc).toBe('09:30');
  });

  test('admin executa robôs e consulta detalhe da execução', async ({ page }) => {
    const adminRobotsPage = new AdminRobotsPage(page);

    await adminRobotsPage.goto();
    await adminRobotsPage.expectRunAllAvailable();
    await adminRobotsPage.runAll();
    await adminRobotsPage.expectRobotRunVisible('CashflowRiskRobot');
    await adminRobotsPage.runRobot('CashflowRiskRobot');
    await adminRobotsPage.openDetails('CashflowRiskRobot');
  });
});
