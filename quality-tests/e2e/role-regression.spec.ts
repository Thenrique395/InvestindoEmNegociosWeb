import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('role regression', () => {
  test('Basic bloqueia investimentos e itens admin', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Basic', profileName: 'Usuário Basic' });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: 'Despesas', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Receitas', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Calendário', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Cartões', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Categorias', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Metas', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Calculadoras', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contas', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Investimentos', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Controle de acessos/i })).toHaveCount(0);

    await page.goto('/calendario', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/calendario$/);

    await page.goto('/categorias', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/categorias$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Organize receitas e despesas' })).toBeVisible();

    await page.goto('/investimentos', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('Basic acessa telas liberadas sem chamar endpoints restritos', async ({ page }) => {
    const restrictedRequests: string[] = [];
    const forbiddenResponses: string[] = [];

    page.on('request', (request) => {
      const path = new URL(request.url()).pathname;
      if (/^\/api\/v1\/(admin|investments|invoice-import|loans|monthlysnapshots|financialassistant)(\/|$)/.test(path)) {
        restrictedRequests.push(`${request.method()} ${path}`);
      }
    });
    page.on('response', (response) => {
      if (response.status() === 403) {
        forbiddenResponses.push(`${response.request().method()} ${new URL(response.url()).pathname}`);
      }
    });

    await setupAuthenticatedApp(page, { role: 'Basic', profileName: 'Usuário Basic' });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: 'Cartões', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Receitas', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Despesas', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Categorias', exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Cartões', exact: true }).click();
    await expect(page).toHaveURL(/\/cartoes$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Seus cartões e ciclos de fatura' })).toBeVisible();

    await page.getByRole('link', { name: 'Receitas', exact: true }).click();
    await expect(page).toHaveURL(/\/receitas$/);
    await expect(page.getByRole('heading', { level: 2, name: /Receitas de/i })).toBeVisible();

    await page.getByRole('link', { name: 'Despesas', exact: true }).click();
    await expect(page).toHaveURL(/\/despesas$/);
    await expect(page.getByRole('heading', { level: 2, name: /Despesas de/i })).toBeVisible();

    await page.getByRole('link', { name: 'Categorias', exact: true }).click();
    await expect(page).toHaveURL(/\/categorias$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Organize receitas e despesas' })).toBeVisible();

    await page.goto('/investimentos', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/admin/usuarios', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard$/);

    expect(restrictedRequests).toEqual([]);
    expect(forbiddenResponses).toEqual([]);
  });

  test('Intermediate acessa calendario mas ainda nao acessa investimentos', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Intermediate', profileName: 'Usuário Intermediate' });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: 'Calendário', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Investimentos', exact: true })).toHaveCount(0);

    await page.goto('/calendario', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/calendario$/);
  });

  test('Advanced libera investimentos e secoes patrimoniais ampliadas', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Advanced', profileName: 'Usuário Advanced' });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: 'Investimentos', exact: true })).toBeVisible();
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
