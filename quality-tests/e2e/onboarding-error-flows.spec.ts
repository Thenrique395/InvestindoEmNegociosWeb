import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';
import {
  advanceToInitialEntriesStep,
  advanceToProfileStep,
  completeInitialEntries,
  loginIntoOnboarding,
  saveInitialIncome
} from './support/onboarding-flow';

const onboardingEmail = 'onboarding-errors.e2e@example.com';
const onboardingPassword = 'senha-e2e-123';
type ApiFailures = NonNullable<Parameters<typeof setupAuthenticatedApp>[1]>['apiFailures'];

async function setupOnboarding(page: Parameters<typeof setupAuthenticatedApp>[0], apiFailures: ApiFailures) {
  await setupAuthenticatedApp(page, {
    role: 'Basic',
    profileName: 'Usuário Onboarding Erro E2E',
    email: onboardingEmail,
    onboardingCompleted: false,
    skipSession: true,
    apiFailures
  });

  await loginIntoOnboarding(page, onboardingEmail, onboardingPassword);
}

test.describe('onboarding error flows', () => {
  test('mantem usuario nos dados basicos quando salvar perfil falha', async ({ page }) => {
    await setupOnboarding(page, [
      {
        path: '/api/v1/profile',
        method: 'PUT',
        status: 500,
        body: { detail: 'Falha ao salvar perfil E2E.' }
      }
    ]);

    await advanceToProfileStep(page);
    await page.getByRole('button', { name: 'Salvar e continuar para conta e lançamentos' }).click();

    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Dados Básicos' })).toBeVisible();
    await expect(page.getByText('Falha ao salvar perfil E2E.')).toBeVisible();
  });

  test('mantem modal de receita aberto quando cadastro inicial falha', async ({ page }) => {
    await setupOnboarding(page, [
      {
        path: '/api/v1/plans',
        method: 'POST',
        requestBodyIncludes: 'Salário E2E',
        status: 500,
        body: { detail: 'Falha ao cadastrar receita E2E.' }
      }
    ]);

    await advanceToInitialEntriesStep(page);
    await page.getByRole('button', { name: 'Adicionar receita' }).click();
    const incomeDialog = page.getByRole('dialog', { name: 'Adicionar receita' });
    await incomeDialog.getByRole('textbox', { name: 'Fonte' }).fill('Salário E2E');
    await incomeDialog.getByRole('combobox', { name: 'Categoria' }).selectOption({ label: 'Salário' });
    await incomeDialog.getByRole('textbox', { name: 'Valor (R$)' }).fill('520000');
    await incomeDialog.getByRole('button', { name: 'Salvar receita' }).click();

    await expect(incomeDialog).toBeVisible();
    await expect(page.getByText('Falha ao cadastrar receita E2E.')).toBeVisible();
  });

  test('mantem modal de despesa aberto quando cadastro inicial falha', async ({ page }) => {
    await setupOnboarding(page, [
      {
        path: '/api/v1/plans',
        method: 'POST',
        requestBodyIncludes: 'Mercado E2E',
        status: 500,
        body: { detail: 'Falha ao cadastrar despesa E2E.' }
      }
    ]);

    await advanceToInitialEntriesStep(page);
    await saveInitialIncome(page);
    await page.getByRole('button', { name: 'Adicionar despesa' }).click();
    const expenseDialog = page.getByRole('dialog', { name: 'Adicionar lançamento' });
    await expenseDialog.getByRole('textbox', { name: 'Nome da despesa' }).fill('Mercado E2E');
    await expenseDialog.getByRole('combobox', { name: 'Categoria' }).selectOption({ label: 'Mercado' });
    await expenseDialog.getByRole('textbox', { name: 'Valor (R$)' }).fill('43050');
    await expenseDialog.getByRole('button', { name: 'Salvar despesa' }).click();

    await expect(expenseDialog).toBeVisible();
    await expect(page.getByText('Falha ao cadastrar despesa E2E.')).toBeVisible();
  });

  test('nao envia para dashboard quando concluir onboarding falha', async ({ page }) => {
    await setupOnboarding(page, [
      {
        path: '/api/v1/onboarding',
        method: 'PUT',
        requestBodyIncludes: '"completed":true',
        status: 500,
        body: { detail: 'Falha ao concluir onboarding E2E.' }
      }
    ]);

    await advanceToInitialEntriesStep(page);
    await completeInitialEntries(page);
    await page.getByRole('button', { name: 'Concluir onboarding' }).click();

    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Ative sua conta e seus primeiros movimentos' })).toBeVisible();
    await expect(page.getByText('Falha ao concluir onboarding E2E.')).toBeVisible();
  });
});
