import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('authenticated finance modules', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Intermediate' });
  });

  test('simula e cria um empréstimo na interface', async ({ page }) => {
    await page.goto('/emprestimos', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { level: 1, name: 'Empréstimos' })).toBeVisible();
    await page.getByLabel('Título').fill('Empréstimo E2E');
    await page.getByRole('button', { name: 'Simular' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Simulação' })).toBeVisible();
    await expect(page.getByText('Parcela inicial')).toBeVisible();

    await page.getByRole('button', { name: 'Criar contrato' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Empréstimo E2E' })).toBeVisible();
    await expect(page.getByText('Empréstimo criado com cronograma calculado.')).toBeVisible();
  });

  test('gera snapshot do mês e adiciona na listagem', async ({ page }) => {
    await page.goto('/snapshots', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { level: 1, name: 'Snapshots mensais' })).toBeVisible();
    await page.getByRole('button', { name: 'Gerar snapshot do mês' }).click();
    await expect(page.getByRole('heading', { level: 2, name: '03/2026' }).first()).toBeVisible();
    await expect(page.getByText('Snapshot gerado com sucesso')).toBeVisible();
  });

  test('troca plano e cancela renovação na interface', async ({ page }) => {
    await page.goto('/planos', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { level: 2, name: 'Assinatura e monetização' })).toBeVisible();
    await page.getByRole('button', { name: 'Anual' }).click();
    await page.locator('.plan-card').filter({ has: page.getByRole('heading', { level: 3, name: 'Intermediate' }) }).getByRole('button', { name: 'Trocar para este plano' }).click();
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(page.locator('.privacy-pill').filter({ hasText: 'Plano atual' }).locator('strong')).toHaveText('Intermediate');

    await page.getByRole('button', { name: 'Cancelar renovação' }).click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.privacy-pill').filter({ hasText: 'Renovação' }).locator('strong')).toHaveText('Cancelada');
  });

  test('carrega segurança e revoga sessões ativas', async ({ page }) => {
    await page.goto('/seguranca', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { level: 2, name: 'Sessões e login' })).toBeVisible();
    await expect(page.locator('.privacy-pill').filter({ hasText: 'Sessões ativas' }).locator('strong')).toHaveText('2');
    await page.getByRole('button', { name: 'Revogar sessões ativas' }).click();
    await expect(page.locator('.privacy-pill').filter({ hasText: 'Sessões ativas' }).locator('strong')).toHaveText('0');
  });
});
