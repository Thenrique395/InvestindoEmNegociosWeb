import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

/**
 * A9/A21 — verificação da migração de `CategoriesComponent`.
 *
 * Este componente usava o antipadrão `effect()` copiando signals do store para
 * campos + `buildViews()` imperativo. A migração removeu o effect e passou a
 * derivar `categoryViews`/`overview` via `computed` diretamente dos signals do store.
 *
 * Comprova que a carga assíncrona das categorias (store → computed) renderiza no
 * headless: o resumo mostra um total > 0 e a lista aparece.
 */
test.describe('categorias — carga via computed (verificação A9/A21)', () => {
  test('renderiza o resumo e a lista de categorias no headless', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Intermediate' });
    await page.goto('/categorias', { waitUntil: 'domcontentloaded' });

    // Resumo renderizou e não ficou preso em "Carregando".
    await expect(page.getByText('Total de categorias')).toBeVisible();
    await expect(page.getByText('Carregando categorias...')).toHaveCount(0);

    // O overview computado tem total > 0 a partir da carga assíncrona do store.
    const total = await page.locator('app-categories').evaluate((el: any) => {
      const cmp = (window as any).ng.getComponent(el);
      return cmp.overview().total;
    });
    expect(total).toBeGreaterThan(0);

    // A lista de categorias renderiza pelo menos um item.
    await expect(page.locator('app-category-list').first()).toBeVisible();
  });
});
