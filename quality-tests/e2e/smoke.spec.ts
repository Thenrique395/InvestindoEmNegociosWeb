import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';
import { completeOnboarding, loginIntoOnboarding } from './support/onboarding-flow';

test.describe('smoke e2e', () => {
  test('login, onboarding, dashboard e permissões Basic', async ({ page }) => {
    const email = 'smoke.basic@example.com';
    const password = 'senha-e2e-123';

    await setupAuthenticatedApp(page, {
      role: 'Basic',
      profileName: 'Usuário Smoke E2E',
      email,
      onboardingCompleted: false,
      skipSession: true
    });

    await loginIntoOnboarding(page, email, password);
    await completeOnboarding(page);

    await expect(page.getByRole('link', { name: 'Despesas', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Receitas', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Calendário', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Cartões', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Investimentos', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);

    await page.getByRole('link', { name: 'Receitas', exact: true }).click();
    await expect(page).toHaveURL(/\/receitas$/);
    await expect(page.getByRole('heading', { level: 2, name: /Receitas de/i })).toBeVisible();

    await page.getByRole('link', { name: 'Despesas', exact: true }).click();
    await expect(page).toHaveURL(/\/despesas$/);
    await expect(page.getByRole('heading', { level: 2, name: /Despesas de/i })).toBeVisible();
  });
});
