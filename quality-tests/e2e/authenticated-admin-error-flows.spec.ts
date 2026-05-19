import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';
import { AdminParametersPage } from './support/page-objects/admin-parameters.page';
import { AdminRobotsPage } from './support/page-objects/admin-robots.page';
import { AdminUsersPage } from './support/page-objects/admin-users.page';
import { CategoriesPage } from './support/page-objects/categories.page';

test.describe('authenticated admin error flows', () => {
  test('mostra erro e não persiste regras globais quando salvar notificações falha', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      role: 'Admin',
      apiFailures: [
        {
          path: '/api/v1/admin/parameters/notification-settings',
          method: 'PUT',
          status: 400,
          body: { detail: 'Erro ao salvar notificações.' }
        }
      ]
    });

    const adminParametersPage = new AdminParametersPage(page);
    await adminParametersPage.goto();
    await adminParametersPage.saveNotificationDays('5');
    await expect(page.getByText('Erro ao salvar notificações.')).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    const section = page.locator('div.rounded-2xl, section.rounded-2xl').filter({ hasText: 'Notificações globais' }).first();
    await expect(section.locator('input[type="number"]').nth(0)).toHaveValue('3');
  });

  test('mostra erro ao executar todos os robôs quando a API falha', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      role: 'Admin',
      apiFailures: [
        {
          path: '/api/v1/admin/robots/run-all',
          method: 'POST',
          status: 500,
          body: { detail: 'Falha ao executar todos os robôs.' }
        }
      ]
    });

    const adminRobotsPage = new AdminRobotsPage(page);
    await adminRobotsPage.goto();
    await page.getByRole('button', { name: 'Executar todos' }).click();
    await expect(page.getByText('Falha ao executar todos os robôs.')).toBeVisible();
  });

  test('mostra erro e não persiste role quando salvar alteração de usuário falha', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      role: 'Admin',
      apiFailures: [
        {
          path: /\/api\/v1\/admin\/users\/[^/]+\/role$/,
          method: 'PUT',
          status: 409,
          body: { detail: 'Não foi possível salvar as alterações.' }
        }
      ]
    });

    const adminUsersPage = new AdminUsersPage(page);
    await adminUsersPage.goto();
    await adminUsersPage.changeRole('maria.basic@example.com', 'Intermediate');
    await expect(page.getByText('Não foi possível salvar as alterações.')).toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await adminUsersPage.expectRole('maria.basic@example.com', 'Basic');
  });

  test('mostra erro e não persiste override por feature quando salvar falha', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      role: 'Admin',
      apiFailures: [
        {
          path: /\/api\/v1\/admin\/users\/[^/]+\/features\/[^/]+$/,
          method: 'PUT',
          status: 409,
          body: { detail: 'Não foi possível atualizar o override da feature.' }
        }
      ]
    });

    const adminUsersPage = new AdminUsersPage(page);
    await adminUsersPage.goto();
    await adminUsersPage.openFeatures('maria.basic@example.com');
    await adminUsersPage.setFeatureMode('Investimentos', 'enabled');
    await expect(page.getByText('Não foi possível atualizar o override da feature.')).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await adminUsersPage.openFeatures('maria.basic@example.com');
    await adminUsersPage.expectFeatureMode('Investimentos', 'inherit');
  });

  test('mostra erro e mantém usuário quando exclusão falha', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      role: 'Admin',
      apiFailures: [
        {
          path: /\/api\/v1\/admin\/users\/[^/]+$/,
          method: 'DELETE',
          status: 409,
          body: { detail: 'Não foi possível excluir o usuário.' }
        }
      ]
    });

    const adminUsersPage = new AdminUsersPage(page);
    await adminUsersPage.goto();
    await adminUsersPage.requestDeleteUser('maria.basic@example.com');
    await adminUsersPage.confirmDeleteUser();
    await expect(page.getByText('Não foi possível excluir o usuário.')).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await adminUsersPage.expectUserVisible('maria.basic@example.com');
  });

  test('mostra erro e mantém categoria padrão original quando edição falha', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      role: 'Admin',
      apiFailures: [
        {
          path: /\/api\/v1\/admin\/categories\/[^/]+$/,
          method: 'PUT',
          status: 400,
          body: { detail: 'Não foi possível salvar a categoria padrão.' }
        }
      ]
    });

    const categoriesPage = new CategoriesPage(page);
    await categoriesPage.goto();
    await categoriesPage.editDefaultCategory('Mercado', 'Mercado alterado');
    await expect(page.getByText('Não foi possível salvar a categoria padrão.')).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await categoriesPage.openAdminDefaultCategories();
    await expect(page.getByText('Mercado', { exact: true })).toBeVisible();
    await expect(page.getByText('Mercado alterado', { exact: true })).toHaveCount(0);
  });
});
