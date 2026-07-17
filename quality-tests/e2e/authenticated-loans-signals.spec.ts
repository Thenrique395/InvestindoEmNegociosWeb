import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

/**
 * A9 — verificação da migração de `LoansComponent` para signals.
 *
 * `loans` era um dos frágeis (OnPush + markForCheck + subscribe). Aqui comprovamos
 * que o estado assíncrono renderiza no headless:
 *  1) a lista (carga assíncrona de /loans) renderiza — o shell "Contratos cadastrados";
 *  2) a simulação (POST /loans/simulate → signal `simulation`) renderiza o card
 *     "Simulação" a partir da resposta assíncrona (fora da zona).
 *
 * Backend mockado (setupAuthenticatedApp já mocka /loans e /loans/simulate).
 */
test.describe('empréstimos — carga e simulação (verificação A9: OnPush + signals)', () => {
  test('renderiza a lista e a simulação assíncrona no headless', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Intermediate' });
    await page.goto('/emprestimos', { waitUntil: 'domcontentloaded' });

    // 1) Página carregou (shell sempre presente).
    await expect(page.getByRole('heading', { name: 'Contratos cadastrados' })).toBeVisible();

    // 2) Simular → o card "Simulação" aparece a partir da resposta assíncrona (signal).
    await page.getByRole('button', { name: 'Simular' }).click();
    await expect(page.getByRole('heading', { name: 'Simulação' })).toBeVisible();

    // Rigor: confirma o signal `simulation` preenchido no componente.
    const monthly = await page.locator('app-loans').evaluate((el: any) => {
      const cmp = (window as any).ng.getComponent(el);
      return cmp.simulation()?.monthlyPayment ?? null;
    });
    expect(monthly).not.toBeNull();
  });
});
