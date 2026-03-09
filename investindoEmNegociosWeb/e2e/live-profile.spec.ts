import { expect, test } from '@playwright/test';
import { completeLiveOnboarding, openUserMenu } from './support/live-auth';

test.describe('live profile flow', () => {
  test.skip(!process.env['RUN_LIVE_SERVER_E2E'], 'Live server E2E roda apenas sob demanda.');

  test('abre preferencias e centro de dados reais', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);

    await page.goto('/preferencias', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 2, name: 'Configurações pessoais' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Português \+ BRL/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salvar preferências' })).toBeVisible();

    await page.goto('/dados', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 2, name: 'Exportar / Importar' })).toBeVisible();
    await expect(page.getByText('Privacidade e exclusão')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Exportar dados' })).toBeVisible();
  });

  test('abre o perfil real e carrega os dados do usuario', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);

    await page.goto('/perfil', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 2, name: 'Dados do usuário' })).toBeVisible();
    await expect(page.getByLabel('Nome')).toHaveValue('Codex Live Usuario');
    await expect(page.getByLabel('Cidade')).toHaveValue('Recife');
    await expect(page.getByLabel('Estado')).toHaveValue('PE');
    await expect(page.getByLabel('País')).toHaveValue('Brasil');
    await expect(page.getByLabel('Modo de inteligência')).toHaveValue('B');
  });

  test('abre a pagina real de seguranca', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);

    await page.goto('/seguranca', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 2, name: 'Sessões e login' })).toBeVisible();
    await expect(page.getByText('Em breve: lista de sessões, logout global, 2FA, últimos logins.')).toBeVisible();
  });

  test('exporta dados reais do usuario', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);

    await page.goto('/dados', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 2, name: 'Exportar / Importar' })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar dados' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename().toLowerCase()).toContain('.json');
  });

  test('envia atualizacao real de preferencias com preview em ingles e usd', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);

    await page.goto('/preferencias', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 2, name: 'Configurações pessoais' })).toBeVisible();

    await page.getByLabel('Moeda').selectOption('USD');
    await page.getByLabel('Idioma da aplicação').selectOption('en-US');
    await page.getByPlaceholder('Ex.: pt-BR ou en-US').fill('fr-FR');
    await page.getByRole('button', { name: 'Adicionar' }).click();
    await expect(page.getByText('fr-FR')).toBeVisible();

    await expect(page.getByText('$12,345.67')).toBeVisible({ timeout: 20000 });

    const saveResponse = page.waitForResponse((response) =>
      response.request().method() === 'PUT' && response.url().includes('/preferences')
    );
    await page.getByRole('button', { name: 'Salvar preferências' }).click();
    await expect((await saveResponse).status()).toBe(200);
  });

  test('faz logout real e bloqueia retorno direto ao dashboard', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);

    await openUserMenu(page);
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Sair' }).click();

    await expect(page).toHaveURL(/\/$/i, { timeout: 30000 });
    await expect(page.getByRole('heading', { level: 1, name: /organizar despesas pessoais/i })).toBeVisible();

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login$/i, { timeout: 30000 });
  });

  test('exclui a conta descartavel via fluxo lgpd real', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);

    await page.goto('/dados', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Privacidade e exclusão')).toBeVisible();

    await page.getByLabel('Senha atual').fill(user.password);
    await page.getByLabel('Digite EXCLUIR para confirmar').fill('EXCLUIR');
    await page.getByRole('button', { name: 'Excluir minha conta' }).click();
    await page.getByRole('button', { name: 'Excluir conta' }).click();

    await expect(page).toHaveURL(/\/$/i, { timeout: 30000 });
    await expect(page.getByRole('heading', { level: 1, name: /organizar despesas pessoais/i })).toBeVisible();
  });
});
