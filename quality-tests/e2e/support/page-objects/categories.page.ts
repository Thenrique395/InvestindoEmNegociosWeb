import { expect, type Page } from '@playwright/test';

export class CategoriesPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/categorias', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('heading', { level: 1, name: 'Categorias' })).toBeVisible();
  }

  async createCategory(name: string, type: 'Income' | 'Expense') {
    await this.page.getByPlaceholder('Nome da categoria').fill(name);
    await this.page.locator('.add-card__form select').selectOption(type);
    const createResponse = this.page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().includes('/categories')
    );
    await this.page.getByRole('button', { name: 'Adicionar', exact: true }).click();
    await expect.poll(async () => (await createResponse).ok()).toBeTruthy();
    await expect(this.page.getByText(name)).toBeVisible({ timeout: 20000 });
  }

  categoryCard(name: string) {
    return this.page.locator('div').filter({ hasText: name }).filter({ hasText: 'Categoria personalizada' }).first();
  }

  async removeCategory(name: string) {
    const deleteResponse = this.page.waitForResponse((response) =>
      response.request().method() === 'DELETE' && response.url().includes('/categories/')
    );
    await this.categoryCard(name).getByRole('button', { name: 'Excluir' }).click();
    await expect(this.page.getByRole('heading', { level: 2, name: 'Remover categoria' })).toBeVisible();
    await this.page.getByRole('button', { name: 'Remover' }).click();
    await expect.poll(async () => (await deleteResponse).ok()).toBeTruthy();
  }

  async expectCategoryAbsent(name: string) {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await expect(this.page.getByText(name)).toHaveCount(0, { timeout: 20000 });
  }

  async openAdminDefaultCategories() {
    await this.page.getByRole('button', { name: 'Categorias padrão (admin)' }).click();
    await expect(this.page.getByRole('heading', { name: 'Categorias padrão (admin)' })).toBeVisible();
  }

  async createDefaultCategory(name: string, type: 'Income' | 'Expense') {
    await this.page.getByPlaceholder('Nome da categoria').fill(name);
    await this.page.locator('.add-card__form select').nth(0).selectOption('default');
    await this.page.locator('.add-card__form select').nth(1).selectOption(type);
    const createResponse = this.page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().includes('/admin/categories')
    );
    await this.page.getByRole('button', { name: 'Adicionar', exact: true }).click();
    await expect.poll(async () => (await createResponse).ok()).toBeTruthy();
  }

  async expectDefaultCategoryVisible(name: string) {
    await this.openAdminDefaultCategories();
    await expect(this.page.getByText(name, { exact: true })).toBeVisible();
  }

  async expectDuplicateDefaultWarning() {
    await expect(this.page.getByText('Já existe uma categoria padrão com esse nome e tipo.')).toBeVisible();
  }

  async editDefaultCategory(currentName: string, nextName: string) {
    await this.openAdminDefaultCategories();
    const card = this.page.locator('section.admin-card div.rounded-xl').filter({ hasText: currentName }).first();
    await card.getByRole('button', { name: 'Editar' }).click();
    await expect(this.page.getByRole('heading', { level: 2, name: 'Editar categoria padrão' })).toBeVisible();
    await this.page.locator('.modal__card input[type="text"]').fill(nextName);
    const response = this.page.waitForResponse((resp) => resp.request().method() === 'PUT' && /\/api\/v1\/admin\/categories\/[^/]+$/.test(new URL(resp.url()).pathname));
    await this.page.locator('.modal__card').getByRole('button', { name: 'Salvar' }).click();
    await response;
  }
}
