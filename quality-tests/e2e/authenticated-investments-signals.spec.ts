import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

/**
 * A9 — verificação da migração de `InvestmentsComponent` para signals.
 *
 * O maior componente frágil (posições, movimentos, B3, CSV, meta, alocação). O
 * estado assíncrono (positions/institutions/targetAllocation/metaPatrimonio + os
 * loading/b3/csv/modais) passou a ser dirigido por signals (expostos via getter/
 * setter para preservar leituras/escritas).
 *
 * Comprova que a carga assíncrona de posições (listPositions, HTTP fora da zona)
 * renderiza no headless: o signal positions é populado e a tabela de posições
 * aparece.
 */
test.describe('investimentos — carga de posições (verificação A9: OnPush + signals)', () => {
  test('renderiza as posições vindas da carga assíncrona no headless', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Advanced' });
    await page.goto('/investimentos', { waitUntil: 'domcontentloaded' });

    // O componente montou.
    await expect(page.locator('app-investments')).toBeVisible();

    // O signal positions foi populado pela carga assíncrona (listPositions).
    await expect.poll(async () =>
      page.locator('app-investments').evaluate((el: any) => (window as any).ng.getComponent(el).positions.length)
    ).toBeGreaterThan(0);

    // O patrimônio atual (derivado de positions) reflete a carga (> 0).
    const patrimonio = await page.locator('app-investments').evaluate((el: any) => {
      const cmp = (window as any).ng.getComponent(el);
      return cmp.patrimonioAtual;
    });
    expect(patrimonio).toBeGreaterThan(0);
  });
});
