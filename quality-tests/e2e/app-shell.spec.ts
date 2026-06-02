import { expect, test } from '@playwright/test';

test.describe('app shell', () => {
  test('abre a home comercial e navega para login', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { level: 1, name: /seu mês financeiro claro/i })).toBeVisible();

    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Acesse sua conta' })).toBeVisible();
    await expect(page.locator('form').getByRole('button', { name: /Entrar no dashboard/i })).toBeVisible();
  });

  test('redireciona rota privada para login quando nao ha sessao', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: /Esqueci minha senha/i })).toBeVisible();
  });

  test('acessa a calculadora publica por rota direta', async ({ page }) => {
    await page.goto('/calculadora', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/calculadora$/);
    await expect(page.getByRole('heading', { level: 2, name: /Simuladores financeiros e trabalhistas/i })).toBeVisible();
    await expect(page.getByText('Juros Compostos')).toBeVisible();
  });

  test('abre a recuperacao de senha a partir do login', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /Esqueci minha senha/i }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Esqueci minha senha' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Enviar link/i })).toBeVisible();
  });
});
