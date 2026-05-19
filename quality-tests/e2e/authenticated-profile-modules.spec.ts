import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';
import { AssistantPage } from './support/page-objects/assistant.page';
import { DataPage } from './support/page-objects/data.page';
import { PreferencesPage } from './support/page-objects/preferences.page';

test.describe('authenticated profile modules', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Intermediate' });
  });

  test('carrega o contexto do assistente e responde uma pergunta', async ({ page }) => {
    const assistantPage = new AssistantPage(page);

    await assistantPage.goto();
    await assistantPage.expectContextLoaded();
    await assistantPage.ask('Qual é meu maior risco financeiro neste mês?');
    await assistantPage.expectAnswer(
      'Qual é meu maior risco financeiro neste mês?',
      'Seu maior risco no mês continua sendo concentração de despesas próximas ao fechamento.'
    );
  });

  test('salva preferências e mantém o estado após recarregar', async ({ page }) => {
    const preferencesPage = new PreferencesPage(page);

    await preferencesPage.goto();
    await preferencesPage.expectLoaded();
    const response = await preferencesPage.saveNotifications(true, '5');
    await expect(response.status()).toBe(200);
    await preferencesPage.reloadAndExpectNotifications(true, '5');
  });

  test('exporta dados e mostra o resumo de privacidade', async ({ page }) => {
    const dataPage = new DataPage(page);

    await dataPage.goto();
    await dataPage.expectPrivacySectionVisible();
    await expect(page.getByText('Sessões ativas')).toBeVisible();
    const download = await dataPage.exportData();
    expect(download.suggestedFilename()).toContain('investindo-export.json');
  });
});
