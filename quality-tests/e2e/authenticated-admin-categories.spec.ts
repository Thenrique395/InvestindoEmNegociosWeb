import { test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';
import { CategoriesPage } from './support/page-objects/categories.page';

test.describe('authenticated admin categories', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Admin' });
  });

  test('admin cria categoria padrão e a visualiza na aba administrativa', async ({ page }) => {
    const categoriesPage = new CategoriesPage(page);

    await categoriesPage.goto();
    await categoriesPage.createDefaultCategory('Streaming E2E', 'Expense');
    await categoriesPage.expectDefaultCategoryVisible('Streaming E2E');
  });

  test('admin recebe aviso funcional ao tentar duplicar categoria padrão', async ({ page }) => {
    const categoriesPage = new CategoriesPage(page);

    await categoriesPage.goto();
    await categoriesPage.openCreateModal();
    await page.getByPlaceholder('Ex.: Moradia').fill('Mercado');
    await page.getByRole('dialog').locator('select').nth(0).selectOption('Expense'); // Tipo
    await page.getByRole('dialog').locator('select').nth(1).selectOption('default'); // Escopo
    await page.getByRole('button', { name: 'Criar categoria' }).click();
    await categoriesPage.expectDuplicateDefaultWarning();
  });
});
