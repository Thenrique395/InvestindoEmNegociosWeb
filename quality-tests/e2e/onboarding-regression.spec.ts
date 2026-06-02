import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('onboarding regression', () => {
  test('mantem usuario sem onboarding preso no fluxo sem shell da aplicacao', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      role: 'Basic',
      profileName: 'Usuário Onboarding E2E',
      onboardingCompleted: false
    });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Vamos definir seu foco inicial' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Cartões' })).toHaveCount(0);

    await page.goto('/cartoes', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Vamos definir seu foco inicial' })).toBeVisible();
  });

  test('prefill de perfil e recarrega categorias ao abrir modais iniciais', async ({ page }) => {
    const categoryRequests: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (request.method() === 'GET' && url.includes('/api/v1/categories')) {
        categoryRequests.push(url);
      }
    });

    await setupAuthenticatedApp(page, {
      role: 'Basic',
      profileName: 'Usuário Onboarding E2E',
      onboardingCompleted: false
    });

    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' });
    await page.getByText('Melhorar vida financeira').click();
    await page.getByRole('button', { name: 'Continuar para preferências' }).click();
    await page.getByText('Balanceado').click();
    await page.getByRole('button', { name: 'Continuar para dados básicos' }).click();

    await expect(page.getByRole('heading', { level: 2, name: 'Dados Básicos' })).toBeVisible();
    await expect(page.getByLabel('Nome completo')).toHaveValue('Usuário Onboarding E2E');
    await expect(page.getByLabel('CPF')).toHaveValue('529.982.247-25');
    await expect(page.getByLabel('Telefone')).toHaveValue('(81) 99999-9999');
    await expect(page.getByLabel('Data de nascimento')).toHaveValue('1991-03-02');
    await expect(page.getByLabel('Cidade')).toHaveValue('Recife');
    await expect(page.getByLabel('Estado (UF)')).toHaveValue('PE');
    await expect(page.getByLabel('País')).toHaveValue('Brasil');

    await page.getByRole('button', { name: 'Salvar e continuar para conta e lançamentos' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Ative sua conta e seus primeiros movimentos' })).toBeVisible();
    await expect(page.getByText('Conta principal criada. Agora você já pode registrar os primeiros lançamentos.')).toBeVisible();

    await page.getByRole('button', { name: 'Adicionar receita' }).click();
    const incomeDialog = page.getByRole('dialog', { name: 'Adicionar receita' });
    await expect(incomeDialog.getByRole('heading', { level: 3, name: 'Adicionar receita' })).toBeVisible();
    await expect(incomeDialog.getByRole('combobox', { name: 'Categoria' })).toContainText('Salário');
    await incomeDialog.getByRole('button', { name: 'Cancelar' }).click();

    await page.getByRole('button', { name: 'Adicionar despesa' }).click();
    const expenseDialog = page.getByRole('dialog', { name: 'Adicionar lançamento' });
    await expect(expenseDialog.getByRole('heading', { level: 3, name: 'Adicionar lançamento' })).toBeVisible();
    await expect(expenseDialog.getByRole('combobox', { name: 'Categoria' })).toContainText('Mercado');

    expect(categoryRequests.filter((url) => url.includes('appliesTo=Income')).length).toBeGreaterThanOrEqual(2);
    expect(categoryRequests.filter((url) => url.includes('appliesTo=Expense')).length).toBeGreaterThanOrEqual(2);
  });
});
