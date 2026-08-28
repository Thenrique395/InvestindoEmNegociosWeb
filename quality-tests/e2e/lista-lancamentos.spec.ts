/**
 * Guarda os dois ajustes da tabela de lançamentos:
 *  - largura declarada por coluna (sem ela, `truncate` aplica max-width:0 e as colunas de
 *    texto encolhem até o piso enquanto Status/Venc./Valor ficam folgadas)
 *  - seletor de itens por página no rodapé (8/16/32, sem persistir)
 */
import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('tabela de lançamentos: larguras e itens por página', () => {
  test('despesas', async ({ page }) => {
    test.setTimeout(90000);
    await setupAuthenticatedApp(page, { role: 'Advanced' });

    // 15 despesas no mês corrente, para a paginação existir de fato.
    const hoje = new Date();
    const mes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    await page.route('**/api/v1/installments**', async (route) => {
      const url = route.request().url();
      if (route.request().method() !== 'GET' || !url.includes('type=Expense')) return route.fallback();
      const itens = Array.from({ length: 15 }, (_, i) => ({
        id: `exp-${i}`, planId: 'plan-1', installmentNo: i + 1,
        dueDate: `${mes}-28`, amount: 100 + i, status: 'Paid',
        title: `Compras mercado Pao de Acucar filial ${i + 1}`,
        planTitle: `Compras mercado Pao de Acucar filial ${i + 1}`,
        categoryId: null, type: 'Expense'
      }));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(itens) });
    });
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/despesas', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 2, name: /Despesas de/i })).toBeVisible();

    const linhas = await page.locator('.responsive-list__row').count();
    console.log('linhas visíveis:', linhas);

    // larguras reais renderizadas
    const larguras = await page.locator('th.responsive-list__cell').evaluateAll(
      els => els.map(e => ({ col: e.textContent!.trim().slice(0, 12), px: Math.round(e.getBoundingClientRect().width) }))
    );
    console.log('LARGURAS:', larguras.map(l => `${l.col}=${l.px}px`).join('  '));

    const sel = page.locator('.responsive-list__page-size-select');
    console.log('seletor por página presente?', await sel.count());
    if (await sel.count()) {
      console.log('opções:', await sel.locator('option').allTextContents());

      await sel.selectOption('16');
      await page.waitForTimeout(400);
      console.log('após escolher 16 -> linhas:', await page.locator('.responsive-list__row').count());
      console.log('rodapé:', (await page.locator('.responsive-list__range').textContent())?.trim());

      await sel.selectOption('8');
      await page.waitForTimeout(400);
      console.log('voltando a 8  -> linhas:', await page.locator('.responsive-list__row').count());

      // texto completo deve caber melhor agora
      const nome = await page.locator('.responsive-list__item[data-label="Nome"]').first().textContent();
      console.log('conteúdo da 1a célula de Nome:', nome?.trim());
    }
  });
});
