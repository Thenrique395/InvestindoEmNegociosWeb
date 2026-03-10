import { expect, type Page } from '@playwright/test';

export class CategoriesPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/categorias', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('heading', { level: 1, name: 'Organize receitas e despesas' })).toBeVisible();
  }

  async createCategory(name: string, type: 'Income' | 'Expense') {
    await this.page.getByPlaceholder('Nome da categoria').fill(name);
    await this.page.locator('.add-card select').selectOption(type);
    const createResponse = this.page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().includes('/categories')
    );
    await this.page.getByRole('button', { name: 'Adicionar' }).click();
    await expect.poll(async () => (await createResponse).ok()).toBeTruthy();
    await expect(this.page.getByText(name)).toBeVisible({ timeout: 20000 });
  }

  categoryCard(name: string) {
    return this.page.locator('div').filter({ hasText: name }).filter({ hasText: 'Categoria personalizada' }).first();
  }

  async removeCategory(name: string) {
    await this.categoryCard(name).getByRole('button', { name: 'Excluir' }).click();
    await expect(this.page.getByRole('heading', { level: 2, name: 'Remover categoria' })).toBeVisible();
    await this.page.getByRole('button', { name: 'Remover' }).click();
  }

  async expectCategoryAbsent(name: string) {
    await expect(this.page.getByText(name)).toHaveCount(0, { timeout: 20000 });
  }

  async openAdminDefaultCategories() {
    await this.page.getByRole('button', { name: 'Categorias padrão (admin)' }).click();
    await expect(this.page.getByRole('heading', { name: 'Categorias padrão (admin)' })).toBeVisible();
  }
}
