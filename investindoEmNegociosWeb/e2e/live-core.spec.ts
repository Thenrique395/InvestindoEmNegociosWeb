import { expect, test } from '@playwright/test';
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

    await page.goto('/cartoes', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 2, name: 'Meus cartões' })).toBeVisible();

    await page.getByRole('button', { name: 'Adicionar cartão' }).first().click();
    await page.getByLabel('Número do cartão').fill(`5555 4444 3333 ${last4}`);
    await page.getByLabel('Nome impresso no cartão').fill(`Cartao Live ${last4}`);
    await page.getByLabel('Banco (opcional)').fill('Banco Live');
    await page.getByLabel('Limite de crédito').fill('850000');
    await page.getByLabel('Dia do fechamento').fill('12');
    await page.getByLabel('Dia do vencimento').fill('20');
    await page.getByRole('button', { name: 'Salvar cartão' }).click();

    await expect(page.getByText(`Cartao Live ${last4}`)).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(`•••• ${last4}`)).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Fatura por competência')).toBeVisible();
  });

  test('abre o dashboard real e alterna os paineis de periodo e risco', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: /Visão geral de/i })).toBeVisible();
    await expect(page.getByText('Saldo Disponível Real')).toBeVisible();
    await expect(page.getByText('Patrimônio líquido').first()).toBeVisible();

    await page.getByRole('button', { name: 'Detalhes' }).click();
    await expect(page.getByText('Painel de risco')).toBeVisible();
    await page.getByRole('button', { name: 'Fechar', exact: true }).click();

    await page.getByRole('button', { name: 'Trimestral' }).click();
    await expect(page.getByRole('heading', { level: 1, name: /Trimestre/i })).toBeVisible();
    await page.getByRole('button', { name: 'Anual' }).click();
    await expect(page.getByRole('heading', { level: 1, name: /Ano de/i })).toBeVisible();
  });

  test('cria uma meta real e registra na listagem', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-6) || 'live';
    const goalName = `Meta Live ${suffix}`;

    await page.goto('/metas', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 2, name: 'Metas anuais' })).toBeVisible();

    await page.getByRole('button', { name: 'Adicionar meta' }).click();
    await page.getByLabel('Nome da meta').fill(goalName);
    await page.getByLabel('Valor da meta (R$)').fill('120000');
    await page.getByLabel('Aporte mensal previsto (R$)').fill('10000');
    await page.getByLabel('Data de vencimento (DD/MM/AAAA)').fill('31122026');
    await page.getByRole('textbox', { name: 'Ano' }).fill('2026');
    await page.getByRole('button', { name: 'Salvar meta' }).click();

    await expect(page.getByText(goalName)).toBeVisible({ timeout: 20000 });
  });

  test('exibe a conta principal real e respeita a restricao do plano Basic', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);

    await page.goto('/contas', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: 'Contas' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Conta principal' })).toBeVisible();

    await page.getByLabel('Nome').fill('Reserva bloqueada live');
    await page.getByLabel('Saldo inicial').fill('300');
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page.getByText('No plano Basic a conta principal é gerenciada automaticamente. Faça upgrade para criar ou editar contas.')).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('heading', { level: 3, name: 'Conta principal' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Reserva bloqueada live' })).toHaveCount(0);

    const principalAccount = page.locator('article').filter({ hasText: 'Conta principal' });
    await principalAccount.getByRole('button', { name: 'Ver extrato' }).click();
    await expect(page.getByRole('heading', { level: 2, name: /Extrato: Conta principal/i })).toBeVisible();
    await expect(page.getByText('Motor de importação de extrato')).toBeVisible();
    await expect(page.getByText(/Saldo atual:/).first()).toBeVisible();
  });
});
