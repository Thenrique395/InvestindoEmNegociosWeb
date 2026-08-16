import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('investimentos — listagem e nova posição', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Advanced' });
  });

  test('carrega página de investimentos com cabeçalho e tabela de ativos', async ({ page }) => {
    await page.goto('/investimentos', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /Carteira e evolução/ }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Posições' })).toBeVisible();
    await expect(page.getByText('Tesouro IPCA+ 2029').first()).toBeVisible();
  });

  test('exibe posição existente na tabela Meus Ativos', async ({ page }) => {
    await page.goto('/investimentos', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Posições' })).toBeVisible();
    await expect(page.getByText('Tesouro IPCA+ 2029').first()).toBeVisible();
  });

  test('cria nova posição via modal de compra e exibe na listagem', async ({ page }) => {
    await page.goto('/investimentos', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'Novo lançamento' }).first().click();
    await expect(page.getByRole('heading', { name: 'Adicionar lançamento' })).toBeVisible();

    // Modal abre em modo Compra por padrão.
    await page.locator('input[name="asset"]').fill('PETR4');
    await page.locator('input[name="quantity"]').fill('10');
    await page.locator('input[name="avgPrice"]').fill('38.50');
    await page.getByLabel('Data da compra').fill('19/06/2026');
    await page.locator('input[name="account"]').fill('XP Investimentos');

    await page.getByRole('button', { name: 'Adicionar lançamento' }).click();

    await expect(page.getByText('PETR4').first()).toBeVisible();
  });

  test('abre modal de lançamento para posição existente', async ({ page }) => {
    await page.goto('/investimentos', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Tesouro IPCA+ 2029').first()).toBeVisible();

    const row = page.locator('tr', { hasText: 'Tesouro IPCA+ 2029' });
    await row.getByRole('button', { name: 'Novo lançamento' }).click();

    await expect(page.getByRole('heading', { name: 'Adicionar lançamento' })).toBeVisible();
  });
});
