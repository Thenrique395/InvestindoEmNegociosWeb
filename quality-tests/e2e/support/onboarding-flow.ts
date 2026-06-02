import { expect, type Page } from '@playwright/test';
import { LoginPage } from './page-objects/login.page';

export async function loginIntoOnboarding(page: Page, email: string, password: string) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(email, password);
  await expect(page).toHaveURL(/\/onboarding$/, { timeout: 10000 });
}

export async function completeOnboarding(page: Page) {
  await page.getByText('Melhorar vida financeira').click();
  await page.getByRole('button', { name: 'Continuar para preferências' }).click();
  await page.getByText('Balanceado').click();
  await page.getByRole('button', { name: 'Continuar para dados básicos' }).click();

  await expect(page.getByRole('heading', { level: 2, name: 'Dados Básicos' })).toBeVisible();
  await expect(page.getByLabel('Nome completo')).not.toHaveValue('');
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
  const incomeCategory = incomeDialog.getByRole('combobox', { name: 'Categoria' });
  await expect(incomeCategory).toContainText('Salário');
  await incomeDialog.getByRole('textbox', { name: 'Fonte' }).fill('Salário E2E');
  await incomeCategory.selectOption({ label: 'Salário' });
  await incomeDialog.getByRole('textbox', { name: 'Valor (R$)' }).fill('520000');
  await incomeDialog.getByRole('button', { name: 'Salvar receita' }).click();
  await expect(incomeDialog).toHaveCount(0);
  await expect(page.getByText(/Salário E2E/)).toBeVisible();

  await page.getByRole('button', { name: 'Adicionar despesa' }).click();
  const expenseDialog = page.getByRole('dialog', { name: 'Adicionar lançamento' });
  await expect(expenseDialog.getByRole('heading', { level: 3, name: 'Adicionar lançamento' })).toBeVisible();
  const expenseCategory = expenseDialog.getByRole('combobox', { name: 'Categoria' });
  await expect(expenseCategory).toContainText('Mercado');
  await expenseDialog.getByRole('textbox', { name: 'Nome da despesa' }).fill('Mercado E2E');
  await expenseCategory.selectOption({ label: 'Mercado' });
  await expenseDialog.getByRole('textbox', { name: 'Valor (R$)' }).fill('43050');
  await expenseDialog.getByRole('button', { name: 'Salvar despesa' }).click();
  await expect(expenseDialog).toHaveCount(0);
  await expect(page.getByText(/Mercado E2E/)).toBeVisible();

  await page.getByRole('button', { name: 'Concluir onboarding' }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Seu mês com clareza' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
}
