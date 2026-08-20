import { expect, test, type Page } from '@playwright/test';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { setupAuthenticatedApp } from './support/authenticated-app';

/**
 * Confirmação de exclusão — o diálogo do protótipo, nos três casos.
 *
 * O caso que esta spec existe para travar é o do lançamento avulso: ele era
 * removido direto, sem diálogo nenhum.
 */
const SAIDA = join(process.cwd(), '..', 'investindoEmNegociosWeb', 'docs', 'ai-reports', 'qa-desktop');

const mes = (() => {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
})();

const plans = [
  { id: 'p1', userId: 'u1', type: 'Expense', title: 'Plano de saúde', amount: 892, schedule: 'Recurring', categoryId: 'cat-default-expense-1', startDate: `${mes}-01`, status: 'Active', installmentsCount: null },
  { id: 'p2', userId: 'u1', type: 'Expense', title: 'Combustível', amount: 412.8, schedule: 'OneTime', categoryId: 'cat-default-expense-1', startDate: `${mes}-03`, status: 'Active', installmentsCount: 1 },
  { id: 'p3', userId: 'u1', type: 'Expense', title: 'Notebook Dell', amount: 641.58, schedule: 'Installments', categoryId: 'cat-default-expense-1', startDate: `${mes}-12`, status: 'Active', installmentsCount: 12 }
];

const installments = [
  { id: 'i1', planId: 'p1', installmentNo: 1, dueDate: `${mes}-01`, amount: 892, status: 'Open' },
  { id: 'i2', planId: 'p2', installmentNo: 1, dueDate: `${mes}-03`, amount: 412.8, status: 'Open' },
  { id: 'i3', planId: 'p3', installmentNo: 4, dueDate: `${mes}-12`, amount: 641.58, status: 'Open' }
];

async function abrirDespesas(page: Page): Promise<void> {
  await setupAuthenticatedApp(page, { role: 'Advanced' });
  await page.route('**/api/v1/plans**', (route) => route.fulfill({ json: plans }));
  await page.route('**/api/v1/installments**', (route) => route.fulfill({ json: installments }));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/despesas', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
}

/** Clica no ícone de excluir da linha cujo nome foi passado. */
async function excluirLinha(page: Page, nome: string): Promise<void> {
  const linha = page.locator('tbody tr').filter({ hasText: nome });
  await linha.getByRole('button', { name: /excluir|remover/i }).first().click();
}

test.describe('confirmação de exclusão', () => {
  test.beforeEach(() => mkdirSync(SAIDA, { recursive: true }));

  test('lançamento avulso também pergunta antes de excluir', async ({ page }) => {
    await abrirDespesas(page);
    await excluirLinha(page, 'Combustível');

    const dialogo = page.getByRole('dialog');
    await expect(dialogo.getByRole('heading', { name: 'Excluir lançamento?' })).toBeVisible();
    await expect(dialogo).toContainText('Combustível');
    await expect(dialogo).toContainText('R$ 412,80');
    await expect(dialogo).toContainText('Essa ação não pode ser desfeita.');
    // Sem escopo a escolher: o avulso não tem série nem recorrência.
    await expect(dialogo.getByRole('radio')).toHaveCount(0);
    await expect(dialogo.getByRole('button', { name: 'Excluir', exact: true })).toBeVisible();

    await page.screenshot({ path: join(SAIDA, 'confirm-delete-avulso.png') });
  });

  test('recorrente escolhe entre o mês e a recorrência', async ({ page }) => {
    await abrirDespesas(page);
    await excluirLinha(page, 'Plano de saúde');

    const dialogo = page.getByRole('dialog');
    await expect(dialogo.getByRole('heading', { name: 'Excluir este mês ou a recorrência?' })).toBeVisible();

    const opcoes = dialogo.getByRole('radio');
    await expect(opcoes).toHaveCount(2);
    await expect(opcoes.nth(0)).toHaveAttribute('aria-checked', 'true');
    await expect(dialogo.getByRole('button', { name: 'Excluir apenas esta' })).toBeVisible();

    await page.screenshot({ path: join(SAIDA, 'confirm-delete-recorrente.png') });

    // A escolha do escopo troca o rótulo do botão destrutivo.
    await opcoes.nth(1).click();
    await expect(opcoes.nth(1)).toHaveAttribute('aria-checked', 'true');
    await expect(dialogo.getByRole('button', { name: 'Encerrar recorrência' })).toBeVisible();
  });

  test('série escolhe entre a parcela e a série', async ({ page }) => {
    await abrirDespesas(page);
    await excluirLinha(page, 'Notebook Dell');

    const dialogo = page.getByRole('dialog');
    await expect(dialogo.getByRole('heading', { name: 'Excluir parcela ou série?' })).toBeVisible();
    await expect(dialogo.getByRole('radio')).toHaveCount(2);

    await dialogo.getByRole('radio').nth(1).click();
    await expect(dialogo.getByRole('button', { name: 'Excluir série' })).toBeVisible();
  });

  test('cancelar fecha sem excluir', async ({ page }) => {
    await abrirDespesas(page);
    await excluirLinha(page, 'Combustível');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('tbody tr').filter({ hasText: 'Combustível' })).toBeVisible();
  });
});
