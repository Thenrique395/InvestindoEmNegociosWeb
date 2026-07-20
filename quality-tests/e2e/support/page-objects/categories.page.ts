import { expect, type Page } from '@playwright/test';

export class CategoriesPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/categorias', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('heading', { level: 1, name: 'Categorias' })).toBeVisible();
  }

  // Criar categoria agora é via modal "Nova categoria" (nome + Tipo + Escopo p/ admin).
  async openCreateModal() {
    await this.page.getByRole('button', { name: /Nova categoria/ }).click();
    await expect(this.page.getByPlaceholder('Ex.: Moradia')).toBeVisible();
  }

  private modalSelects() {
    // app-modal usa body-portal (role="dialog"), então os selects não ficam sob <app-modal>.
    return this.page.getByRole('dialog').locator('select');
  }

  async createCategory(name: string, type: 'Income' | 'Expense') {
    await this.openCreateModal();
    await this.page.getByPlaceholder('Ex.: Moradia').fill(name);
    await this.modalSelects().nth(0).selectOption(type);
    const createResponse = this.page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().includes('/categories')
    );
    await this.page.getByRole('button', { name: 'Criar categoria' }).click();
    await expect.poll(async () => (await createResponse).ok()).toBeTruthy();
    await expect(this.page.getByText(name).first()).toBeVisible({ timeout: 20000 });
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

  // Admin cria categoria de sistema escolhendo Escopo = "Sistema" no mesmo modal.
  async createDefaultCategory(name: string, type: 'Income' | 'Expense') {
    await this.openCreateModal();
    await this.page.getByPlaceholder('Ex.: Moradia').fill(name);
    await this.modalSelects().nth(0).selectOption(type); // Tipo
    await this.modalSelects().nth(1).selectOption('default'); // Escopo
    const createResponse = this.page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().includes('/admin/categories')
    );
    await this.page.getByRole('button', { name: 'Criar categoria' }).click();
    await expect.poll(async () => (await createResponse).ok()).toBeTruthy();
  }

  async expectDefaultCategoryVisible(name: string) {
    // Admin vê as categorias de sistema inline na lista unificada.
    await expect(this.page.getByText(name, { exact: true }).first()).toBeVisible({ timeout: 20000 });
  }

  async expectDuplicateDefaultWarning() {
    await expect(this.page.getByText('Já existe uma categoria de sistema com esse nome e tipo.')).toBeVisible();
  }

  async editDefaultCategory(currentName: string, nextName: string) {
    // Admin edita a categoria de sistema inline (botão "Editar" na lista) → modal.
    await this.page.getByRole('button', { name: `Editar categoria de sistema ${currentName}` }).first().click();
    await expect(this.page.getByRole('heading', { name: 'Editar categoria de sistema' })).toBeVisible();
    const dialog = this.page.getByRole('dialog');
    await dialog.getByRole('textbox').first().fill(nextName);
    const response = this.page.waitForResponse((resp) => resp.request().method() === 'PUT' && /\/api\/v1\/admin\/categories\/[^/]+$/.test(new URL(resp.url()).pathname));
    await dialog.getByRole('button', { name: 'Salvar' }).click();
    await response;
  }
}
