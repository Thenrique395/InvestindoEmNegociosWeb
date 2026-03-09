import { expect, test } from '@playwright/test';
import { completeLiveOnboarding } from './support/live-auth';

test.describe('live access flow', () => {
  test.skip(!process.env['RUN_LIVE_SERVER_E2E'], 'Live server E2E roda apenas sob demanda.');

  test('abre a receita real e evidencia ausencia de categorias ativas', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);

    await page.goto('/receitas', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 2, name: 'Suas fontes de receita' })).toBeVisible();

    await page.getByRole('button', { name: 'Adicionar receita' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Adicionar receita' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Fonte', exact: true }).fill('Freela live sem categoria');
    await expect(page.getByText('Nenhuma categoria de receita ativa encontrada.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salvar receita' })).toBeDisabled();
  });

  test('abre a despesa real e evidencia ausencia de categorias ativas', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);

    await page.goto('/despesas', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Adicionar despesa' }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Adicionar despesa' }).first().click();
    await expect(page.getByRole('heading', { level: 3, name: 'Adicionar lançamento' })).toBeVisible();
    await page.getByLabel('Nome da despesa').fill('Despesa live sem categoria');
    await expect(page.getByText('Crie uma categoria primeiro para continuar.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salvar despesa' })).toBeDisabled();
  });

  test('abre categorias por rota direta para usuario Basic', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const user = await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);
    const suffix = user.email.match(/(\d+)/)?.[1]?.slice(-5) || 'live';
    const categoryName = `Categoria Live ${suffix}`;

    await page.goto('/categorias', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: 'Organize receitas e despesas' })).toBeVisible();

    await page.getByPlaceholder('Nome da categoria').fill(categoryName);
    await page.locator('select').nth(1).selectOption('Expense');
    await page.getByRole('button', { name: 'Adicionar' }).click();

    await expect(page.getByText(categoryName)).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Categoria personalizada')).toBeVisible();
  });

  test('redireciona usuario Basic ao tentar abrir calendario', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);

    await page.goto('/calendario', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard$/i, { timeout: 20000 });
    await expect(page.getByRole('heading', { level: 1, name: /Visão geral de/i })).toBeVisible();
  });

  test('redireciona usuario Basic ao tentar abrir investimentos', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);

    await page.goto('/investimentos', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard$/i, { timeout: 20000 });
    await expect(page.getByText('Saldo Disponível Real')).toBeVisible();
  });

  test('redireciona usuario Basic ao tentar abrir admin parametros', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await completeLiveOnboarding(page, testInfo.workerIndex, testInfo.retry);

    await page.goto('/admin/parametros', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard$/i, { timeout: 20000 });
    await expect(page.getByText('Patrimônio líquido').first()).toBeVisible();
  });
});
