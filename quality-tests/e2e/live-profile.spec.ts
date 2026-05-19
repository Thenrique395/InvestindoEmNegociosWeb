import { expect, test } from '@playwright/test';
import { DataPage } from './support/page-objects/data.page';
import { PreferencesPage } from './support/page-objects/preferences.page';
import { ProfilePage } from './support/page-objects/profile.page';
import { SecurityPage } from './support/page-objects/security.page';
import { UserMenuComponent } from './support/page-objects/user-menu.component';
import { completeLiveOnboarding } from './support/live-auth';
import { liveEndpointAvailable } from './support/live-api';

test.describe('live profile flow', () => {
  test.skip(!process.env['RUN_LIVE_SERVER_E2E'], 'Live server E2E roda apenas sob demanda.');

  test('abre preferencias e centro de dados reais', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const preferencesPage = new PreferencesPage(page);
    const dataPage = new DataPage(page);

    await preferencesPage.goto();
    await preferencesPage.expectLoaded();

    await dataPage.goto();
    await dataPage.expectPrivacySectionVisible();
    await expect(page.getByRole('button', { name: 'Exportar dados' })).toBeVisible();
  });

  test('abre o perfil real e carrega os dados do usuario', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const profilePage = new ProfilePage(page);

    await profilePage.goto();
    await profilePage.expectDefaultProfileData();
  });

  test('abre a pagina real de seguranca', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    test.skip(!(await liveEndpointAvailable('/preferences/security-summary')), 'Servidor remoto ainda não publicou o resumo de segurança.');
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const securityPage = new SecurityPage(page);

    await securityPage.goto();
    await securityPage.expectSummaryLoaded();
  });

  test('exporta dados reais do usuario', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const dataPage = new DataPage(page);

    await dataPage.goto();
    const download = await dataPage.exportData();

    expect(download.suggestedFilename().toLowerCase()).toContain('.json');
  });

  test('salva preferencia real de notificacao', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const preferencesPage = new PreferencesPage(page);

    await preferencesPage.goto();
    const response = await preferencesPage.saveNotifications(true, '5');
    await expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.notifications?.emailEnabled).toBe(true);
    expect(body.notifications?.daysBeforeDue).toBe(5);
    await preferencesPage.reloadAndExpectNotifications(true, '5');
  });

  test('faz logout real e bloqueia retorno direto ao dashboard', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const userMenu = new UserMenuComponent(page);

    await userMenu.logout();

    await expect(page).toHaveURL(/\/$/i, { timeout: 30000 });
    await expect(page.getByRole('heading', { level: 1, name: /organizar despesas pessoais/i })).toBeVisible();

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login$/i, { timeout: 30000 });
  });

  test('exclui a conta descartavel via fluxo lgpd real', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const dataPage = new DataPage(page);

    await dataPage.goto();
    await dataPage.expectPrivacySectionVisible();
    await dataPage.deleteAccount(user.password);

    await expect(page).toHaveURL(/\/$/i, { timeout: 30000 });
    await expect(page.getByRole('heading', { level: 1, name: /organizar despesas pessoais/i })).toBeVisible();
  });
});
