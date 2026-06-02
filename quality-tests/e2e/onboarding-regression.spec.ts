import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';
import { completeOnboarding, loginIntoOnboarding } from './support/onboarding-flow';

const onboardingEmail = 'onboarding.e2e@example.com';
const onboardingPassword = 'senha-e2e-123';

test.describe('onboarding regression', () => {
  test('loga e mantem usuario sem onboarding preso no fluxo sem shell da aplicacao', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      role: 'Basic',
      profileName: 'Usuário Onboarding E2E',
      email: onboardingEmail,
      onboardingCompleted: false,
      skipSession: true
    });

    await loginIntoOnboarding(page, onboardingEmail, onboardingPassword);

    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Vamos definir seu foco inicial' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Cartões' })).toHaveCount(0);

    await page.goto('/cartoes', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Vamos definir seu foco inicial' })).toBeVisible();
  });

  test('loga, preenche onboarding e recarrega categorias ao abrir modais iniciais', async ({ page }) => {
    const categoryRequests: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (request.method() === 'GET' && url.includes('/api/v1/categories')) {
        categoryRequests.push(url);
      }
    });

    await setupAuthenticatedApp(page, {
      role: 'Basic',
      profileName: 'Usuário Onboarding E2E',
      email: onboardingEmail,
      onboardingCompleted: false,
      skipSession: true
    });

    await loginIntoOnboarding(page, onboardingEmail, onboardingPassword);
    await completeOnboarding(page);

    expect(categoryRequests.filter((url) => url.includes('appliesTo=Income')).length).toBeGreaterThanOrEqual(2);
    expect(categoryRequests.filter((url) => url.includes('appliesTo=Expense')).length).toBeGreaterThanOrEqual(2);
  });
});
