import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('empréstimos — edição e exclusão', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Intermediate' });
  });

  test('edita título de um contrato existente', async ({ page }) => {
    await page.goto('/emprestimos', { waitUntil: 'domcontentloaded' });

    await page.getByLabel('Título').fill('Empréstimo Original');
    await page.getByRole('button', { name: 'Simular', exact: true }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Simulação' })).toBeVisible();
    await page.getByRole('button', { name: 'Criar contrato' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Empréstimo Original' })).toBeVisible();

    await page.getByRole('button', { name: 'Editar' }).first().click();
    await expect(page.getByRole('heading', { level: 2, name: 'Editar contrato' })).toBeVisible();

    await page.getByLabel('Título').fill('Empréstimo Atualizado');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();

    await expect(page.getByRole('heading', { level: 3, name: 'Empréstimo Atualizado' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Empréstimo Original' })).not.toBeVisible();
  });

  test('exclui um contrato e remove da listagem', async ({ page }) => {
    await page.goto('/emprestimos', { waitUntil: 'domcontentloaded' });

    await page.getByLabel('Título').fill('Contrato para Excluir');
    await page.getByRole('button', { name: 'Simular', exact: true }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Simulação' })).toBeVisible();
    await page.getByRole('button', { name: 'Criar contrato' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Contrato para Excluir' })).toBeVisible();

    await page.getByRole('button', { name: 'Excluir' }).first().click();

    await expect(page.getByRole('heading', { level: 3, name: 'Contrato para Excluir' })).not.toBeVisible();
    await expect(page.getByText('Contrato excluído.')).toBeVisible();
  });

  test('cancelar edição restaura o formulário para criação', async ({ page }) => {
    await page.goto('/emprestimos', { waitUntil: 'domcontentloaded' });

    await page.getByLabel('Título').fill('Contrato para Cancelar Edição');
    await page.getByRole('button', { name: 'Simular', exact: true }).click();
    await page.getByRole('button', { name: 'Criar contrato' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Contrato para Cancelar Edição' })).toBeVisible();

    await page.getByRole('button', { name: 'Editar' }).first().click();
    await expect(page.getByRole('heading', { level: 2, name: 'Editar contrato' })).toBeVisible();

    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Novo contrato' })).toBeVisible();
  });
});

test.describe('assistente financeiro', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Intermediate' });
  });

  test('carrega contexto e responde uma pergunta', async ({ page }) => {
    await page.goto('/assistente', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Assistente financeiro')).toBeVisible();

    const textarea = page.getByLabel('Pergunta');
    await textarea.fill('Qual é meu maior risco financeiro neste mês?');
    await page.getByRole('button', { name: 'Perguntar' }).click();

    await expect(page.locator('.bubble__q').first()).toContainText('Qual é meu maior risco financeiro neste mês?');
    await expect(page.locator('.bubble__a').first()).toContainText('Seu maior risco');
  });

  test('histórico da conversa persiste ao navegar via sidebar e voltar', async ({ page }) => {
    await page.goto('/assistente', { waitUntil: 'domcontentloaded' });

    const textarea = page.getByLabel('Pergunta');
    await textarea.fill('Como está meu patrimônio?');
    await page.getByRole('button', { name: 'Perguntar' }).click();

    await expect(page.locator('.bubble__q').first()).toContainText('Como está meu patrimônio?');
    await expect(page.locator('.bubble__a').first()).toContainText('Seu maior risco');

    await page.getByRole('link', { name: /dashboard|início|home/i }).first().click();
    await page.getByRole('link', { name: /assistente/i }).first().click();

    await expect(page.locator('.bubble__q').first()).toContainText('Como está meu patrimônio?');
    await expect(page.locator('.bubble__a').first()).toBeVisible();
  });
});
