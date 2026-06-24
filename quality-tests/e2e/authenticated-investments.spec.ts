import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('investimentos — listagem e nova posição', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Advanced' });
  });

  test('carrega página de investimentos com cabeçalho e tabela de ativos', async ({ page }) => {
    await page.goto('/investimentos', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { level: 2, name: 'Carteira, evolução e decisões' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Meus Ativos' })).toBeVisible();
    await expect(page.getByText('Tesouro IPCA+ 2029')).toBeVisible();
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

    // Modal abre em modo Compra por padrão — preenche com name attributes
    await page.locator('input[name="asset"]').fill('PETR4');
    await page.locator('input[name="quantity"]').fill('10');
    await page.locator('input[name="avgPrice"]').fill('38.50');
    await page.locator('input[name="openedAt"]').fill('2026-06-19');
    await page.locator('input[name="account"]').fill('XP Investimentos');

    await page.getByRole('button', { name: 'Adicionar lançamento' }).click();

    await expect(page.getByText('PETR4')).toBeVisible();
  });

  test('abre modal de lançamento para posição existente', async ({ page }) => {
    await page.goto('/investimentos', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Tesouro IPCA+ 2029')).toBeVisible();

    const row = page.locator('tr', { hasText: 'Tesouro IPCA+ 2029' });
    await row.getByRole('button', { name: 'Novo lançamento' }).click();

    await expect(page.getByRole('heading', { name: 'Adicionar lançamento' })).toBeVisible();
  });
});
