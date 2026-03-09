import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('authenticated app shell', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page);
  });

  test('abre dashboard com resumos financeiros oficiais', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { level: 1, name: /Visão geral de/i })).toBeVisible();
    await expect(page.getByText('Saldo Disponível Real')).toBeVisible();
    await expect(page.getByText('Patrimônio líquido', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Mapa de dívidas')).toBeVisible();
    await expect(page.getByText('Cartões').first()).toBeVisible();
    await expect(page.getByText('Mercado Fatura')).toBeVisible();
    await page.getByRole('button', { name: 'Detalhes' }).click();
    await expect(page.getByText('Painel de risco')).toBeVisible();
    await expect(page.getByText('Como chegamos nesse score:')).toBeVisible();
    await expect(page.getByText('Separe R$ 300,00 para reforçar a reserva.')).toBeVisible();
    await expect(page.getByText('Simulação diária')).toBeVisible();
    await expect(page.getByText('Menor saldo:')).toBeVisible();
    await page.getByRole('button', { name: 'Fechar', exact: true }).click();

    await page.getByRole('button', { name: 'Trimestral' }).click();
    await expect(page.getByRole('heading', { level: 1, name: /Trimestre/i })).toBeVisible();
    await page.getByRole('button', { name: 'Anual' }).click();
    await expect(page.getByRole('heading', { level: 1, name: /Ano de 2026/i })).toBeVisible();
  });

  test('mantem fallback local na home quando resumos oficiais falham', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      role: 'Advanced',
      apiFailures: [
        { path: '/api/v1/accounts/summary/real-balance', method: 'GET', status: 500 },
        { path: '/api/v1/accounts/summary/debts', method: 'GET', status: 500 },
        { path: '/api/v1/accounts/summary/net-worth', method: 'GET', status: 500 },
        { path: '/api/v1/accounts/summary/net-worth/history', method: 'GET', status: 500 },
        { path: '/api/v1/accounts/summary/projection', method: 'GET', status: 500 },
        { path: '/api/v1/accounts/summary/risk', method: 'GET', status: 500 },
        { path: '/api/v1/accounts/summary/insights', method: 'GET', status: 500 },
        { path: '/api/v1/accounts/summary/recommendations', method: 'GET', status: 500 }
      ]
    });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Saldo Disponível Real')).toBeVisible();
    await expect(page.getByText('R$ 8.580,00').first()).toBeVisible();
    await expect(page.getByText('Patrimônio líquido').first()).toBeVisible();
    await expect(page.getByText('R$ 8.400,00').first()).toBeVisible();
    await expect(page.getByText('Saldos por conta')).toBeVisible();
    await expect(page.getByText('Mapa de dívidas')).toHaveCount(0);
  });

  test('abre contas e exibe extrato importado', async ({ page }) => {
    await page.goto('/contas', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { level: 1, name: 'Contas' })).toBeVisible();
    await page.getByRole('button', { name: 'Ver extrato' }).first().click();

    await expect(page.getByRole('heading', { level: 2, name: /Extrato: Conta principal/i })).toBeVisible();
    await expect(page.getByText('Motor de importação de extrato')).toBeVisible();
    await expect(page.getByText('PIX SALARIO')).toBeVisible();
    await expect(page.getByText('Mercado bairro')).toBeVisible();
  });

  test('abre cartoes e carrega a fatura por competencia', async ({ page }) => {
    await page.goto('/cartoes', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { level: 2, name: 'Meus cartões' })).toBeVisible();
    await expect(page.getByText('Fatura por competência')).toBeVisible();
    await expect(page.getByText(/Ciclo 03\/2026/i)).toBeVisible();
    await expect(page.getByText('Total:')).toBeVisible();
    await expect(page.getByText('Em aberto:')).toBeVisible();
  });
});
