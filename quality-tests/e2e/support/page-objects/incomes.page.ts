import { expect, type Locator, type Page } from '@playwright/test';

export class IncomesPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/receitas', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('heading', { level: 2, name: /Receitas de/i })).toBeVisible();
  }

  async openCreateModal() {
    await this.page.getByRole('button', { name: 'Adicionar receita', exact: true }).click();
    await expect(this.page.getByRole('heading', { level: 2, name: 'Adicionar receita' })).toBeVisible();
  }

  createForm(): Locator {
    return this.page.locator('form').filter({ has: this.page.getByRole('textbox', { name: 'Fonte', exact: true }) }).first();
  }

  editForm(): Locator {
    return this.createForm();
  }

  async expectNoActiveCategories() {
    await expect(this.page.getByText('Crie uma categoria antes de continuar.')).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Salvar receita' })).toBeDisabled();
  }

  async expectCategoryOptionVisible(name: string) {
    await expect(this.createForm().getByLabel('Categoria')).toContainText(name);
  }

  async createIncome(name: string, categoryName: string, amount: string, recurring = false, receivedDateDDMMYYYY = '09032026') {
    const form = this.createForm();
    await form.getByRole('textbox', { name: 'Fonte', exact: true }).fill(name);
    await form.getByLabel('Categoria').selectOption({ label: categoryName });
    if (recurring) {
      // O input real é "sr-only" (escondido visualmente; a UI usa um switch customizado),
      // então o Playwright não o considera "visible" para a ação check() padrão.
      await form.getByLabel('Receita recorrente').check({ force: true });
    }
    await form.getByLabel('Valor (R$)').fill(amount);
    await form.getByLabel('Data de recebimento').fill(receivedDateDDMMYYYY);
    const response = this.page.waitForResponse((res) => res.request().method() === 'POST' && res.url().includes('/plans'));
    await form.getByRole('button', { name: 'Salvar receita' }).click();
    await expect.poll(async () => (await response).ok()).toBeTruthy();
  }

  rowByName(name: string) {
    return this.page.locator('tr').filter({ hasText: name }).first();
  }

  async reloadAndExpectRow(name: string) {
    await expect(this.rowByName(name)).toBeVisible({ timeout: 20000 });
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await expect(this.rowByName(name)).toBeVisible({ timeout: 20000 });
  }

  async markAsReceived(name: string) {
    const row = this.rowByName(name);
    await row.getByLabel('Selecionar receita').check();
    await this.page.getByRole('button', { name: 'Marcar como recebida' }).click();
    await expect(row.getByText('Recebido')).toBeVisible({ timeout: 20000 });
  }

  async expectStatus(name: string, status: string) {
    await expect(this.rowByName(name).getByText(status)).toBeVisible({ timeout: 20000 });
  }

  async filterRecurring() {
    await this.page.getByLabel('Tipo').selectOption('recurring');
  }

  async openEdit(name: string) {
    await this.rowByName(name).getByRole('button', { name: 'Editar' }).click();
    await expect(this.page.getByRole('heading', { level: 3, name: /Editar receita/i })).toBeVisible();
  }

  async saveIncomeEdit(name: string, amount: string) {
    const form = this.editForm();
    await form.getByRole('textbox', { name: 'Fonte', exact: true }).fill(name);
    await form.getByLabel('Valor (R$)').fill(amount);
    const response = this.page.waitForResponse((res) => res.request().method() === 'PUT' && res.url().includes('/plans/'));
    await form.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect.poll(async () => (await response).ok()).toBeTruthy();
  }

  async deleteIncome(name: string, recurring = false) {
    await this.rowByName(name).getByRole('button', { name: 'Excluir' }).click();
    await expect(this.page.getByRole('heading', { level: 3, name: 'Confirmar remoção' })).toBeVisible();

    if (recurring) {
      const response = this.page.waitForResponse((res) => res.request().method() === 'DELETE' && res.url().includes('/plans/'));
      await this.page.getByRole('button', { name: 'Encerrar recorrência' }).click();
      await expect.poll(async () => (await response).ok()).toBeTruthy();
    } else {
      const response = this.page.waitForResponse((res) => res.request().method() === 'DELETE' && res.url().includes('/installments/'));
      await this.page.getByRole('button', { name: 'Excluir receita' }).click();
      await expect.poll(async () => (await response).ok()).toBeTruthy();
    }
  }
}
