import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('investimentos — listagem e nova posição', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Intermediate' });
  });

  test('exibe posição existente na tabela Meus Ativos', async ({ page }) => {
    await page.goto('/investimentos', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Meus Ativos' })).toBeVisible();
    await expect(page.getByText('Tesouro IPCA+ 2029')).toBeVisible();
  });

  test('cria nova posição via modal de compra e exibe na listagem', async ({ page }) => {
    await page.goto('/investimentos', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'Novo lançamento' }).first().click();
    await expect(page.getByRole('heading', { name: 'Adicionar lançamento' })).toBeVisible();

    await page.getByRole('button', { name: 'Compra' }).click();

    await page.getByLabel('Ativo').fill('PETR4');
    await page.getByLabel('Quantidade').fill('10');
    await page.getByLabel('Preço em R$').first().fill('38.50');
    await page.getByLabel('Data da compra').fill('2026-06-19');
    await page.getByLabel('Conta/Corretora').fill('XP Investimentos');

    await page.getByRole('button', { name: 'Adicionar lançamento' }).click();

    await expect(page.getByText('PETR4')).toBeVisible();
  });

  test('abre modal de movimento para posição existente', async ({ page }) => {
    await page.goto('/investimentos', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Tesouro IPCA+ 2029')).toBeVisible();

    const row = page.locator('tr', { hasText: 'Tesouro IPCA+ 2029' });
    await row.getByRole('button', { name: 'Novo lançamento' }).click();

    await expect(page.getByRole('heading', { name: /Registrar compra\/venda para Tesouro IPCA\+ 2029/i })).toBeVisible();
  });
});

test.describe('investimentos — page loads for Intermediate', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Intermediate' });
  });

  test('carrega página de investimentos com cabeçalho e tabela de ativos', async ({ page }) => {
    await page.goto('/investimentos', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /carteira/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Meus Ativos' })).toBeVisible();
    await expect(page.getByText('Tesouro IPCA+ 2029')).toBeVisible();
  });
});
