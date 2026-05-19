import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('role regression', () => {
  test('Basic bloqueia investimentos e itens admin', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Basic', profileName: 'Usuário Basic' });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: 'Calendário' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Calculadoras' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contas' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Cartões' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Investimentos' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Controle de acessos/i })).toHaveCount(0);

    await page.goto('/calendario', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/calendario$/);

    await page.goto('/investimentos', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('Intermediate acessa calendario mas ainda nao acessa investimentos', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Intermediate', profileName: 'Usuário Intermediate' });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: 'Calendário' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Investimentos' })).toHaveCount(0);

    await page.goto('/calendario', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/calendario$/);
  });

  test('Advanced libera investimentos e secoes patrimoniais ampliadas', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Advanced', profileName: 'Usuário Advanced' });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: 'Investimentos' })).toBeVisible();
    await expect(page.getByText('Saldos por conta')).toBeVisible();
    await expect(page.getByText('Evolução patrimonial')).toBeVisible();
  });

  test('Admin acessa modulos administrativos', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Admin', profileName: 'Usuário Admin' });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Parâmetros' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Robôs' })).toBeVisible();

    await page.goto('/admin/usuarios', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: 'Controle de acessos' })).toBeVisible();
  });
});
