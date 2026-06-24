import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';
import { completeOnboarding, loginIntoOnboarding } from './support/onboarding-flow';

const signupName = 'Usuário Cadastro E2E';
const signupEmail = 'cadastro.e2e@example.com';
const signupPassword = 'senha-e2e-123';

test.describe('signup onboarding', () => {
  test('cria uma conta nova e conclui onboarding ate o dashboard', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      role: 'Basic',
      profileName: signupName,
      email: signupEmail,
      onboardingCompleted: false,
      skipSession: true
    });

    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: 'Vamos começar' })).toBeVisible();

    await page.getByLabel('Nome completo').fill(signupName);
    await page.getByLabel('E-mail').fill(signupEmail);
    await page.getByPlaceholder('000.000.000-00').fill('529.982.247-25');
    await page.getByPlaceholder('Digite sua senha').fill(signupPassword);
    await page.getByPlaceholder('Confirme sua senha').fill(signupPassword);
    await page.getByLabel('Li e aceito os termos de uso e a política de privacidade.').check();
    await page.getByRole('button', { name: 'Criar conta agora' }).click();

    await expect(page).toHaveURL(/\/login$/, { timeout: 10000 });
    await loginIntoOnboarding(page, signupEmail, signupPassword);

    await completeOnboarding(page);
  });
});
