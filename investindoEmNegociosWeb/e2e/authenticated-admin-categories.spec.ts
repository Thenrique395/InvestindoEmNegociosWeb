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
    await page.getByPlaceholder('Nome da categoria').fill('Mercado');
    await page.locator('.add-card select').nth(0).selectOption('default');
    await page.locator('.add-card select').nth(1).selectOption('Expense');
    await page.getByRole('button', { name: 'Adicionar' }).click();
    await categoriesPage.expectDuplicateDefaultWarning();
  });
});
