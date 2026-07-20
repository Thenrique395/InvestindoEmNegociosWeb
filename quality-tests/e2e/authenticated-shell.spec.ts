import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('authenticated app shell', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page);
  });

  test('abre dashboard com resumos financeiros oficiais', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // Dashboard atual (Visão Geral Financeira). Assertions modernizadas: o painel de
    // risco/score/simulação diária e a troca de período por heading foram removidos no
    // refactor; verificamos os cards/seções que o dashboard renderiza hoje.
    await expect(page.getByRole('heading', { level: 1, name: /Visão Geral Financeira/i })).toBeVisible();
    await expect(page.getByText('Saldo disponível').first()).toBeVisible();
    await expect(page.getByText('Patrimônio líquido', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Mapa de dívidas').first()).toBeVisible();
    await expect(page.getByText('Saúde financeira').first()).toBeVisible();
  });

  test('oculta e restaura valores financeiros pelo topbar', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    const hideValues = page.getByRole('button', { name: 'Ocultar valores financeiros' });
    await expect(hideValues).toBeVisible();
    await hideValues.click();

    await expect(page.getByText('••••••').first()).toBeVisible();
    const showValues = page.getByRole('button', { name: 'Exibir valores financeiros' });
    await expect(showValues).toBeVisible();
    await showValues.click();

    await expect(page.getByRole('button', { name: 'Ocultar valores financeiros' })).toBeVisible();
    await expect(page.getByText('••••••')).toHaveCount(0);
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

    // Mesmo com os resumos oficiais falhando (500), a home mantém o cálculo local:
    // o dashboard renderiza e os cards de saldo/patrimônio aparecem com valores locais.
    await expect(page.getByRole('heading', { level: 1, name: /Visão Geral Financeira/i })).toBeVisible();
    await expect(page.getByText('Saldo disponível').first()).toBeVisible();
    await expect(page.getByText('Patrimônio líquido').first()).toBeVisible();
    await expect(page.getByText('R$ 8.400,00').first()).toBeVisible();
  });

  test('abre contas e exibe extrato importado', async ({ page }) => {
    await page.goto('/contas', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Contas' }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Extrato' }).first().click();

    await expect(page.getByRole('heading', { level: 2, name: /Extrato: Conta principal/i })).toBeVisible();
    await expect(page.getByText('Motor de importação com IA')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'PIX SALARIO' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Mercado bairro' }).first()).toBeVisible();
  });

  test('abre cartoes e carrega a fatura por competencia', async ({ page }) => {
    await page.goto('/cartoes', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { level: 2, name: 'Seus cartões e ciclos de fatura' })).toBeVisible();
    await expect(page.getByText('Faturas do cartão')).toBeVisible();
    await expect(page.getByText(/Ciclo 03\/2026/i)).toBeVisible();
    await expect(page.getByText('Total', { exact: true })).toBeVisible();
    await expect(page.getByText('Em aberto', { exact: true })).toBeVisible();
  });
});
