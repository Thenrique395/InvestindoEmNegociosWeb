import { expect, test } from '@playwright/test';

test.describe('commercial checkout', () => {
  test('leva da pagina de planos ao checkout com o plano selecionado', async ({ page }) => {
    await page.goto('/planos', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { level: 1, name: /comece com clareza/i })).toBeVisible();

    await page.getByRole('link', { name: /Escolher Controle/i }).click();

    await expect(page).toHaveURL(/\/checkout\?plan=intermediate&cycle=Monthly/);
    await expect(page.getByRole('heading', { level: 1, name: /finalize sua assinatura/i })).toBeVisible();
  });

  test('finaliza o retorno do checkout pago com status real vindo do backend', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'fake.jwt.token');
      localStorage.setItem('refresh_token', 'refresh-token');
      localStorage.setItem('user_role', 'Basic');
      localStorage.setItem('access_expires_at', new Date(Date.now() + 60 * 60 * 1000).toISOString());
    });

    await page.route('**/api/v1/billing/checkout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          checkoutId: '11111111-1111-1111-1111-111111111111',
          provider: 'stripe',
          status: 'Pending',
          checkoutUrl: 'http://127.0.0.1:4300/checkout/sucesso?session_id=cs_test_123&checkout_id=11111111-1111-1111-1111-111111111111',
          planCode: 'advanced',
          billingCycle: 'Yearly',
          amount: 599,
          currency: 'BRL',
          expiresAt: null
        })
      });
    });

    await page.route('**/api/v1/billing/checkout-status/by-session/cs_test_123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          checkoutId: '11111111-1111-1111-1111-111111111111',
          provider: 'stripe',
          status: 'Paid',
          planCode: 'advanced',
          billingCycle: 'Yearly',
          amount: 599,
          currency: 'BRL',
          providerCheckoutId: 'cs_test_123',
          providerSubscriptionId: 'sub_123',
          providerPaymentStatus: 'paid',
          requiresLogin: false,
          canRetry: false,
          canOpenPortal: true,
          subscriptionActive: true,
          autoRenew: true,
          expiresAt: null,
          completedAt: '2026-03-15T10:00:00Z',
          renewsAt: '2027-03-15T10:00:00Z',
          cancelledAt: null,
          refundedAt: null,
          failureReason: null
        })
      });
    });

    await page.route('**/api/v1/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          userId: 'user-1',
          name: 'Cliente Teste',
          email: 'cliente@teste.com',
          role: 'Advanced',
          token: 'new.fake.jwt.token',
          refreshToken: 'new-refresh-token',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        })
      });
    });

    await page.route('**/api/v1/profile', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          userId: 'user-1',
          fullName: 'Cliente Teste',
          document: '12345678901',
          phone: '81999999999',
          financialGoal: 'Organizar',
          carryOverDay: 5,
          intelligenceMode: 'B',
          currency: 'BRL',
          locales: ['pt-BR']
        })
      });
    });

    await page.route('**/api/v1/notifications**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('/checkout?plan=advanced&cycle=Yearly', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /^Continuar$/i }).first().click();
    await page.getByRole('button', { name: /^Continuar$/i }).first().click();
    await page.getByRole('button', { name: /^Continuar$/i }).first().click();
    await page.getByRole('button', { name: /Ir para pagamento/i }).click();

    await expect(page).toHaveURL(/\/checkout\/sucesso/);
    await expect(page.getByRole('heading', { level: 1, name: /Patrimônio ativado com sucesso/i })).toBeVisible();
    await expect(page.getByText(/status real do pagamento/i)).toBeVisible();
  });
});
