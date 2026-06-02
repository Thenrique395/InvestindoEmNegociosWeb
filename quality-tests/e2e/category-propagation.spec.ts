import { test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';
import { CategoriesPage } from './support/page-objects/categories.page';
import { ExpensesPage } from './support/page-objects/expenses.page';
import { IncomesPage } from './support/page-objects/incomes.page';

test.describe('category propagation', () => {
  test('categorias padrao criadas pelo admin aparecem nos modais de receita e despesa', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Admin' });

    const categoriesPage = new CategoriesPage(page);
    await categoriesPage.goto();
    await categoriesPage.createDefaultCategory('Bonus Admin E2E', 'Income');
    await categoriesPage.createDefaultCategory('Moradia Admin E2E', 'Expense');

    const incomesPage = new IncomesPage(page);
    await incomesPage.goto();
    await incomesPage.openCreateModal();
    await incomesPage.expectCategoryOptionVisible('Bonus Admin E2E');

    const expensesPage = new ExpensesPage(page);
    await expensesPage.goto();
    await expensesPage.openCreateModal();
    await expensesPage.expectCategoryOptionVisible('Moradia Admin E2E');
  });

  test('modais orientam o usuario quando nao existe categoria ativa', async ({ page }) => {
    await setupAuthenticatedApp(page, {
      role: 'Basic',
      categories: [],
      adminCategories: []
    });

    const incomesPage = new IncomesPage(page);
    await incomesPage.goto();
    await incomesPage.openCreateModal();
    await incomesPage.expectNoActiveCategories();

    const expensesPage = new ExpensesPage(page);
    await expensesPage.goto();
    await expensesPage.openCreateModal();
    await expensesPage.expectNoActiveCategories();
  });
});
