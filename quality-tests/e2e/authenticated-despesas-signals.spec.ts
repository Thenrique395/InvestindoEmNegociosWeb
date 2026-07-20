import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

/**
 * A9 — verificação da migração de `DespesasComponent` para signals.
 *
 * O componente consome os observables do ApiDataService (expenses$/cards$) e
 * carrega categorias/contas/bandeiras por HTTP (fora da zona). A migração passou
 * despesasPorMes/categorias/cartoes/contas/cardBrandMap (e os loading/Set states)
 * para signals.
 *
 * Comprova que a carga assíncrona renderiza no headless: o resumo aparece e a
 * lista de despesas é derivada de despesasPorMes (signal), sem depender de tick
 * de zona.
 */
test.describe('despesas — carga assíncrona (verificação A9: OnPush + signals)', () => {
  test('renderiza o resumo e a lista derivada de signals no headless', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Intermediate' });
    await page.goto('/despesas', { waitUntil: 'domcontentloaded' });

    // O card de resumo renderizou (página carregou past o load inicial no headless).
    await expect(page.getByText('Pendentes').first()).toBeVisible();

    // A lista (derivada de despesasPorMes signal) renderizou.
    await expect(page.locator('app-despesas-lista')).toBeVisible();

    // As categorias vieram de uma carga HTTP assíncrona (/categories) e populam o
    // signal — prova de que async → signal → render funciona no headless.
    await expect.poll(async () =>
      page.locator('app-despesas').evaluate((el: any) => (window as any).ng.getComponent(el).categorias().length)
    ).toBeGreaterThan(0);
  });
});
