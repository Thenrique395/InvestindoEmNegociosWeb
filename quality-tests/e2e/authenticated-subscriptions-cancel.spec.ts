import { expect, test, type Route } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

/**
 * A9 — verificação da migração de `SubscriptionsComponent` para signals.
 *
 * Este fluxo (carregar catálogo → abrir diálogo de confirmação → cancelar) usa
 * exatamente o padrão que ANTES travava no headless: OnPush + resposta HTTP fora
 * da zona (withFetch) + `markForCheck()`. Com os campos migrados para `signal()`,
 * a re-renderização passa a ser dirigida pelos signals, independente de tick de zona.
 *
 * Assertivas decisivas:
 *  1) o catálogo (plano pago) renderiza no headless — `catalog()` signal;
 *  2) o clique em "Cancelar renovação" abre o `app-confirm-dialog` — `confirmCancelOpen()`
 *     signal (é aqui que a tela ficava presa em headless antes da migração);
 *  3) confirmar cancela e a UI reflete `autoRenew=false` a partir da resposta assíncrona.
 *
 * Roda contra o backend mockado (setupAuthenticatedApp), sobrescrevendo apenas as
 * rotas de assinatura para um plano pago com renovação automática ativa.
 */

const paidCurrent = {
  planCode: 'intermediate',
  planName: 'Intermediate',
  role: 'Intermediate',
  status: 'Active',
  billingCycle: 'Monthly',
  priceAmount: 29.9,
  currency: 'BRL',
  autoRenew: true,
  startedAt: '2026-05-01T10:00:00Z',
  renewsAt: '2026-08-01T10:00:00Z',
  cancelledAt: null
};

const paidPlans = [
  {
    code: 'basic',
    name: 'Basic',
    role: 'Basic',
    description: 'Plano inicial',
    monthlyPrice: 0,
    yearlyPrice: 0,
    recommended: false,
    current: false,
    features: ['Dashboard'],
    limits: {}
  },
  {
    code: 'intermediate',
    name: 'Intermediate',
    role: 'Intermediate',
    description: 'Plano intermediário',
    monthlyPrice: 29.9,
    yearlyPrice: 299,
    recommended: true,
    current: true,
    features: ['Importação de fatura'],
    limits: { categorias: 'Ilimitadas' }
  }
];

async function json(route: Route, body: unknown) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

test.describe('assinatura — cancelamento (verificação A9: OnPush + signals)', () => {
  test('carrega catálogo pago, abre o diálogo e cancela a renovação no headless', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Intermediate' });

    // Registradas DEPOIS do catch-all do harness → têm prioridade (ordem reversa no Playwright).
    await page.route('**/api/v1/subscriptions/catalog', async (route) =>
      json(route, { current: paidCurrent, plans: paidPlans, notes: ['Nota'] })
    );
    await page.route('**/api/v1/subscriptions/cancel', async (route) =>
      json(route, {
        current: { ...paidCurrent, status: 'Cancelled', autoRenew: false, role: 'Basic', cancelledAt: '2026-07-17T10:00:00Z' },
        session: {
          userId: '44444444-4444-4444-4444-444444444444',
          name: 'Henrique Santos',
          email: 'mock@example.com',
          role: 'Basic',
          token: 'jwt-basic',
          refreshToken: 'refresh-basic',
          expiresAt: '2026-08-01T11:00:00Z'
        },
        notes: ['Nota']
      })
    );

    await page.goto('/assinatura', { waitUntil: 'domcontentloaded' });

    // 1) Catálogo pago renderizou (catalog() signal). O card "Cancelar renovação" só
    //    aparece com plano pago + autoRenew=true + status ativo.
    const cancelCard = page.getByRole('heading', { level: 2, name: 'Cancelar renovação' });
    await expect(cancelCard).toBeVisible();

    // 2) Abrir o diálogo de confirmação — o ponto que travava no headless.
    await page.locator('app-section-card')
      .filter({ has: cancelCard })
      .getByRole('button', { name: 'Cancelar renovação' })
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Cancelar renovação automática?' })).toBeVisible();

    // 3) Confirmar → resposta assíncrona atualiza o signal catalog → UI reflete cancelamento.
    await dialog.getByRole('button', { name: 'Cancelar renovação' }).click();

    // O alerta "Renovação cancelada" aparece a partir do novo estado (autoRenew=false).
    await expect(page.getByText('Renovação cancelada')).toBeVisible();

    // Rigor extra: lê o signal direto do componente para confirmar o estado real.
    const autoRenew = await page.locator('app-subscriptions').evaluate((el: any) => {
      const cmp = (window as any).ng.getComponent(el);
      return cmp.catalog().current.autoRenew;
    });
    expect(autoRenew).toBe(false);

    // O diálogo fechou após confirmar.
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
