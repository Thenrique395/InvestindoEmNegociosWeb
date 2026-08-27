import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';
import { LoginPage } from './support/page-objects/login.page';

/**
 * Regressão: o login ficava preso na própria tela, DENTRO do shell autenticado —
 * sidebar e topbar em volta, mas o router-outlet ainda em /login.
 *
 * `auth.login()` grava o cookie e o app.component troca o shell assim que `isLogged`
 * vira true. Os `<router-outlet>` do ramo deslogado e do logado são elementos
 * diferentes, então a troca DESTRÓI o LoginComponent enquanto o `getProfile()` ainda
 * está em voo. Com `takeUntilDestroyed` na cadeia, a resposta era descartada e a
 * navegação nunca acontecia.
 *
 * Os mocks da suíte respondem SEM ATRASO, então o getProfile resolvia antes da
 * destruição e o bug não aparecia em teste — só em DEV e PRD. Este teste injeta
 * latência de propósito: é a única forma de reproduzir a corrida.
 */
test.describe('login: navegação sobrevive à troca de shell', () => {
  test('com /profile lento, ainda sai do /login', async ({ page }) => {
    test.setTimeout(60000);
    const email = 'latencia.login@example.com';
    const password = 'senha-e2e-123';

    await setupAuthenticatedApp(page, {
      role: 'Intermediate',
      email,
      onboardingCompleted: false,
      skipSession: true
    });

    // Latência real no perfil — o ponto exato da corrida.
    await page.route('**/api/v1/profile', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await new Promise((r) => setTimeout(r, 800));
      await route.fallback();
    });

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(email, password);

    // O que quebrava: a URL continuava /login, com a sidebar em volta.
    await expect(page).not.toHaveURL(/\/login/, { timeout: 25000 });
    await expect(page.getByRole('heading', { name: 'Acesse sua conta' })).toHaveCount(0);
    console.log('OK login navegou; URL final =', page.url());
  });
});
