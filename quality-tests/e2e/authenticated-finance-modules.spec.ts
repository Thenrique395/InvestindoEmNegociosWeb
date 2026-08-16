import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('authenticated finance modules', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Intermediate' });
  });

  test('simula e cria um empréstimo na interface', async ({ page }) => {
    await page.goto('/emprestimos', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Planejamento de passivos')).toBeVisible();
    await page.getByRole('button', { name: 'Novo contrato' }).click();
    await page.getByLabel('Título').fill('Empréstimo E2E');
    await page.getByRole('button', { name: 'Simular', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Simulação' })).toBeVisible();
    await expect(page.getByText('Parcela inicial')).toBeVisible();

    await page.getByRole('button', { name: 'Criar contrato' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Empréstimo E2E' })).toBeVisible();
    await expect(page.getByText('Empréstimo criado com cronograma calculado.')).toBeVisible();
  });

  test('gera snapshot do mês e adiciona na listagem', async ({ page }) => {
    await page.goto('/snapshots', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Histórico mensal' }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Gerar snapshot' }).click();
    await expect(page.locator('.snapshot').first()).toBeVisible();
  });

  test('redireciona troca de plano pago para checkout', async ({ page }) => {
    await page.goto('/assinatura', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Minha assinatura' }).first()).toBeVisible();
    await page.getByRole('radio', { name: 'Anual' }).click();
    await page.locator('.plan-card').filter({ has: page.getByRole('heading', { level: 3, name: 'Intermediate' }) }).getByRole('button', { name: 'Trocar para este plano' }).click();

    await expect(page).toHaveURL(/\/checkout\?plan=intermediate&cycle=Yearly/);
    await expect(page.getByRole('heading', { level: 1, name: /finalize sua assinatura/i })).toBeVisible();
  });

  test('carrega segurança e revoga sessões ativas', async ({ page }) => {
    await page.goto('/seguranca', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Sessões e login' }).first()).toBeVisible();
    await expect(page.locator('app-transaction-summary-card').filter({ hasText: 'Sessões ativas' }).getByText('2')).toBeVisible();
    await page.getByRole('button', { name: 'Revogar sessões ativas' }).click();
    // Agora há um diálogo de confirmação antes de revogar.
    await page.getByRole('button', { name: 'Revogar sessões', exact: true }).click();
    await expect(page.getByText(/sessão\(ões\) revogada\(s\)\./)).toBeVisible();
  });
});
