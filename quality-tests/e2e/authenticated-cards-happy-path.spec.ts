import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

/**
 * Happy-path de Cartões — trava as regressões corrigidas na auditoria:
 *  - A19: cartão recém-criado deve APARECER na tela (reatividade OnPush via computed).
 *  - A20: editar um cartão deve SALVAR (validação não pode barrar com o número
 *         mascarado/last4).
 *
 * Roda contra o backend mockado (setupAuthenticatedApp), stateful para cards CRUD.
 */
test.describe('cartões — happy path (regressões A19/A20)', () => {
  test('cria, exibe, edita e exclui cartão', async ({ page }) => {
    await setupAuthenticatedApp(page);
    await page.goto('/cartoes', { waitUntil: 'domcontentloaded' });

    // ---- CRIAR ----
    await page.getByRole('button', { name: /Adicionar cartão|Registrar um/i }).first().click();

    const brandSelect = page.getByLabel('Bandeira');
    if (await brandSelect.isVisible().catch(() => false)) {
      const firstBrand = await brandSelect.locator('option').first().getAttribute('value');
      if (firstBrand) await brandSelect.selectOption(firstBrand);
    }
    await page.getByLabel('Número do cartão').fill('4111 1111 1111 4321');
    await page.getByLabel(/Nome( impresso)? (do|no) cartão/).fill('TITULAR E2E QA');
    await page.getByLabel(/Banco( \(opcional\))?/).fill('Banco QA');
    await page.getByLabel('Limite de crédito').fill('500000'); // máscara: valor/100 => R$ 5.000,00
    await page.getByLabel('Dia do fechamento').fill('10');
    await page.getByLabel('Dia do vencimento').fill('18');
    await page.getByRole('button', { name: 'Salvar cartão' }).click();

    // A19 — o cartão recém-criado DEVE aparecer NA LISTA (antes do fix, a tela ficava vazia).
    await expect(page.locator('.cards-list__title', { hasText: 'TITULAR E2E QA' })).toBeVisible();
    await expect(page.getByText(/5\.000,00/).first()).toBeVisible();

    // ---- EDITAR (A20) ----
    await page.getByRole('button', { name: 'Editar cartão' }).first().click();
    await page.getByLabel('Limite de crédito').fill('800000'); // => R$ 8.000,00
    await page.getByRole('button', { name: /Salvar alterações|Salvar cartão/ }).click();

    // A20 — a edição SALVA (antes do fix, a validação do número mascarado bloqueava).
    await expect(page.getByText('Revise os campos destacados antes de salvar.')).toHaveCount(0);
    await expect(page.getByText(/8\.000,00/).first()).toBeVisible();

    // ---- EXCLUIR ----
    await page.getByRole('button', { name: 'Remover cartão' }).first().click();
    await page.locator('button.btn-danger').filter({ hasText: 'Remover cartão' }).click();
    await expect(page.locator('.cards-list__title', { hasText: 'TITULAR E2E QA' })).toHaveCount(0);
  });
});
