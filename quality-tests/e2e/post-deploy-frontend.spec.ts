import { expect, test } from '@playwright/test';

const expectedApiBaseUrl = process.env['EXPECTED_API_BASE_URL'];

test.describe('frontend post-deploy smoke', () => {
  test.skip(!expectedApiBaseUrl, 'EXPECTED_API_BASE_URL nao configurada.');

  test('abre o login e chama a API configurada', async ({ page }) => {
    const normalizedApiBaseUrl = expectedApiBaseUrl!.replace(/\/$/, '');
    let capturedLoginRequestUrl: string | null = null;

    await page.route('**/auth/login', async (route) => {
      capturedLoginRequestUrl = route.request().url();

      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          title: 'Nao autorizado',
          status: 401
        })
      });
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { level: 1, name: 'Acesse sua conta' })).toBeVisible();

    await page.locator('input[name="email"]').fill('smoke@example.com');
    await page.locator('input[name="password"]').fill('SmokeTest123!');
    await page.getByRole('button', { name: /Entrar no dashboard/i }).click();

    await expect.poll(() => capturedLoginRequestUrl).not.toBeNull();
    await expect
      .soft(page.getByText(/erro ao autenticar|nao autorizado|usu[aá]rio|senha/i))
      .toBeVisible({ timeout: 10000 });

    expect(capturedLoginRequestUrl).toBe(`${normalizedApiBaseUrl}/auth/login`);
  });
});
