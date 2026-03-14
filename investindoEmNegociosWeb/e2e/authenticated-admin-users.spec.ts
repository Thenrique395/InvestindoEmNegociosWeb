import { test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';
import { AdminUsersPage } from './support/page-objects/admin-users.page';

test.describe('authenticated admin users', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Admin' });
  });

  test('admin altera role de usuário e mantém o novo nível na grade', async ({ page }) => {
    const adminUsersPage = new AdminUsersPage(page);

    await adminUsersPage.goto();
    await adminUsersPage.expectUserVisible('maria.basic@example.com');
    await adminUsersPage.expectRole('maria.basic@example.com', 'Basic');
    await adminUsersPage.changeRole('maria.basic@example.com', 'Intermediate');
    await adminUsersPage.expectRole('maria.basic@example.com', 'Intermediate');
  });

  test('admin abre features e aplica override em acesso específico', async ({ page }) => {
    const adminUsersPage = new AdminUsersPage(page);

    await adminUsersPage.goto();
    await adminUsersPage.openFeatures('maria.basic@example.com');
    await adminUsersPage.expectFeatureMode('Investimentos', 'inherit');
    await adminUsersPage.setFeatureMode('Investimentos', 'enabled');
    await adminUsersPage.expectFeatureMode('Investimentos', 'enabled');
  });
});
