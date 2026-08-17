import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

/**
 * O handoff exige tooltip em todo indicador (README §8). O gate de fidelidade garante que
 * o texto existe; só o navegador garante que ele é legível.
 *
 * O risco concreto: o painel abre para CIMA (`inset-block-end: calc(100% + .875rem)`) com
 * largura fixa de 280px. Numa faixa de KPI no topo da página, um texto longo vira uma
 * caixa alta que sai pela borda superior da viewport — e um tooltip cortado é pior que
 * nenhum, porque o usuário não sabe o que perdeu.
 */

/**
 * Metas fica de fora: a faixa dela é condicionada a `views().length` e o mock desta suíte
 * não serve `/api/v1/goals`, então a tela cai no estado vazio e não há tooltip para medir.
 * Histórico mensal cobre o pior caso de altura — o texto do Risco é o mais longo do app.
 */
const TELAS = [
  { rota: '/orcamento', nome: 'Orçamento' },
  { rota: '/emprestimos', nome: 'Empréstimos' },
  { rota: '/snapshots', nome: 'Histórico mensal' },
];

test.describe('tooltips de indicador — legibilidade', () => {
  for (const { rota, nome } of TELAS) {
    test(`${nome}: todo tooltip da faixa de KPI cabe na viewport`, async ({ page }) => {
      test.setTimeout(60000);
      await setupAuthenticatedApp(page, { role: 'Advanced' });

      // 1440 é a largura de referência; a faixa de KPI fica no topo, que é o pior caso
      // para um painel que abre para cima.
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(rota, { waitUntil: 'domcontentloaded' });

      const gatilhos = page.locator('app-transaction-summary-card app-tooltip button');

      // `count()` não espera: sem isto ele roda antes do Angular montar a faixa e volta 0.
      await expect(
        gatilhos.first(),
        `${nome} deveria ter indicador com tooltip`,
      ).toBeVisible({ timeout: 15000 });

      const total = await gatilhos.count();

      for (let i = 0; i < total; i++) {
        const gatilho = gatilhos.nth(i);
        await gatilho.click();

        const painel = gatilho.locator('.tooltip__panel');
        await expect(painel).toBeVisible();

        const caixa = await painel.boundingBox();
        expect(caixa, `${nome}: painel ${i} sem caixa`).not.toBeNull();

        // Cortado no topo é o modo de falha desta posição.
        expect(
          caixa!.y,
          `${nome}: tooltip ${i} sai pela borda superior (y=${caixa!.y})`,
        ).toBeGreaterThanOrEqual(0);

        // E precisa caber na horizontal, dentro da viewport.
        expect(caixa!.x, `${nome}: tooltip ${i} sai pela esquerda`).toBeGreaterThanOrEqual(0);
        expect(
          caixa!.x + caixa!.width,
          `${nome}: tooltip ${i} sai pela direita`,
        ).toBeLessThanOrEqual(1440);

        // Fecha antes do próximo, senão dois painéis abertos se sobrepõem.
        await gatilho.click();
      }
    });
  }

  test('o texto explica o cálculo, não repete o rótulo', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Advanced' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/emprestimos', { waitUntil: 'domcontentloaded' });

    const gatilho = page
      .locator('app-transaction-summary-card', { hasText: 'Parcela mensal' })
      .locator('app-tooltip button');
    await gatilho.click();

    // A distinção que o rótulo esconde: saldo devedor soma todos os contratos, a parcela
    // mensal só os ativos. É por isso que os dois números não se correspondem.
    await expect(gatilho.locator('.tooltip__panel')).toContainText('status Ativo');
  });
});
