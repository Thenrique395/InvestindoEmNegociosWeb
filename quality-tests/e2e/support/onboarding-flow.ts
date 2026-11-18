import { expect, type Page } from '@playwright/test';
import { LoginPage } from './page-objects/login.page';

export async function loginIntoOnboarding(page: Page, email: string, password: string) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(email, password);
  await expect(page).toHaveURL(/\/onboarding$/, { timeout: 10000 });
}

export async function advanceToProfileStep(page: Page) {
  await page.getByText('Melhorar vida financeira').click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByText('Balanceado').click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();

  await expect(page.getByRole('heading', { level: 2, name: 'Dados básicos' })).toBeVisible();
  await expect(page.getByLabel('Nome completo')).not.toHaveValue('');
  await expect(page.getByLabel('CPF')).toHaveValue('529.982.247-25');
  await expect(page.getByLabel('Telefone')).toHaveValue('(81) 99999-9999');
  await expect(page.getByLabel('Data de nascimento')).toHaveValue('02/03/1991');
  await expect(page.getByLabel('Cidade')).toHaveValue('Recife');
  await expect(page.getByLabel('Estado (UF)')).toHaveValue('PE');
  await expect(page.getByLabel('País')).toHaveValue('Brasil');
}

export async function advanceToInitialEntriesStep(page: Page) {
  await advanceToProfileStep(page);
  await page.getByRole('button', { name: 'Salvar e continuar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Ative sua conta e seus primeiros movimentos' })).toBeVisible();
  await expect(page.getByText('Conta principal criada. Agora você já pode registrar os primeiros lançamentos.')).toBeVisible();
}

export async function saveInitialIncome(page: Page) {
  await page.getByRole('button', { name: 'Adicionar receita' }).click();
  const incomeDialog = page.getByRole('dialog', { name: 'Registrar uma entrada' });
  await expect(incomeDialog.getByRole('heading', { level: 2, name: 'Registrar uma entrada' })).toBeVisible();
  const incomeCategory = incomeDialog.getByRole('combobox', { name: 'Categoria da receita' });
  await incomeDialog.getByRole('textbox', { name: 'Fonte' }).fill('Salário E2E');
  await incomeCategory.click();
  await page.getByRole('option', { name: 'Salário', exact: true }).click();
  await incomeDialog.getByRole('textbox', { name: /^Valor/ }).fill('520000');
  await incomeDialog.getByRole('button', { name: 'Salvar receita' }).click();
  await expect(incomeDialog).toHaveCount(0);
  await expect(page.getByText(/Salário E2E/)).toBeVisible();
}

export async function saveInitialExpense(page: Page) {
  await page.getByRole('button', { name: 'Adicionar despesa' }).click();
  const expenseDialog = page.getByRole('dialog', { name: 'Registrar uma saída' });
  await expect(expenseDialog.getByRole('heading', { level: 2, name: 'Registrar uma saída' })).toBeVisible();
  const expenseCategory = expenseDialog.getByRole('combobox', { name: 'Categoria da despesa' });
  await expenseDialog.getByRole('textbox', { name: 'Descrição' }).fill('Mercado E2E');
  await expenseCategory.click();
  await page.getByRole('option', { name: 'Mercado', exact: true }).click();
  await expenseDialog.getByRole('textbox', { name: /^Valor/ }).fill('43050');
  await expenseDialog.getByRole('button', { name: 'Salvar despesa' }).click();
  await expect(expenseDialog).toHaveCount(0);
  await expect(page.getByText(/Mercado E2E/)).toBeVisible();
}

export async function completeInitialEntries(page: Page) {
  await saveInitialIncome(page);
  await saveInitialExpense(page);
}

export async function completeOnboarding(page: Page) {
  await advanceToInitialEntriesStep(page);
  await completeInitialEntries(page);

  await page.getByRole('button', { name: 'Concluir', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10000 });
  await expect(page.getByRole('heading', { level: 1, name: /^(Bom dia|Boa tarde|Boa noite),/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
}
