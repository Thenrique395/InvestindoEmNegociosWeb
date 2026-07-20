import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

/**
 * A9 — verificação da migração de `ReceitasComponent` para signals.
 *
 * O componente consome os observables do ApiDataService (incomes$/incomeSummary$/
 * incomesLoading$), alimentados por HTTP fora da zona. A migração passou
 * rendasAll/summary/loadingMes (e demais estados assíncronos) para signals.
 *
 * Comprova que a carga assíncrona renderiza no headless: o resumo aparece e a
 * tela sai do estado de "carregando" (loadingMes = false), sem depender de tick
 * de zona.
 */
test.describe('receitas — carga assíncrona (verificação A9: OnPush + signals)', () => {
  test('renderiza o resumo e sai do loading no headless', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Intermediate' });
    await page.goto('/receitas', { waitUntil: 'domcontentloaded' });

    // Os cards de resumo (gated por hasAccess('Basic')) renderizaram.
    await expect(page.getByText('Recebidas').first()).toBeVisible();
    await expect(page.getByText('Pendentes').first()).toBeVisible();

    // O componente saiu do loading assíncrono (signal loadingMes = false).
    await expect.poll(async () =>
      page.locator('app-receitas').evaluate((el: any) => (window as any).ng.getComponent(el).loadingMes())
    ).toBe(false);

    // A lista de receitas renderizou (componente filho presente).
    await expect(page.locator('app-receitas-lista')).toBeVisible();
  });
});
