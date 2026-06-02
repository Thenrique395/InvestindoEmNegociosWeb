import { expect, type Locator, type Page } from '@playwright/test';

export class ExpensesPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/despesas', { waitUntil: 'domcontentloaded' });
  }

  async expectLoaded() {
    await expect(this.page.getByRole('button', { name: 'Adicionar despesa' }).first()).toBeVisible();
  }

  async openCreateModal() {
    await this.page.getByRole('button', { name: 'Adicionar despesa' }).first().click();
    await expect(this.page.getByRole('heading', { level: 3, name: 'Adicionar lançamento' })).toBeVisible();
  }

  createForm(): Locator {
    return this.page.locator('form').filter({ has: this.page.getByLabel('Nome da despesa') }).first();
  }

  editForm(): Locator {
    return this.createForm();
  }

  async expectNoActiveCategories() {
    await expect(this.page.getByText('Crie uma categoria antes de continuar.')).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Salvar despesa' })).toBeDisabled();
  }

  async expectCategoryOptionVisible(name: string) {
    await expect(this.createForm().getByLabel('Categoria')).toContainText(name);
  }

  async createExpense(name: string, categoryName: string, amount: string) {
    const form = this.createForm();
    await form.getByLabel('Nome da despesa').fill(name);
    await form.getByLabel('Categoria').selectOption({ label: categoryName });
    await form.getByLabel('Valor (R$)').fill(amount);
    await form.getByLabel('Primeiro vencimento (DD/MM/AAAA)').fill('09032026');
    const response = this.page.waitForResponse((res) => res.request().method() === 'POST' && res.url().includes('/plans'));
    await form.getByRole('button', { name: 'Salvar despesa' }).click();
    await expect.poll(async () => (await response).ok()).toBeTruthy();
  }

  rowByName(name: string) {
    return this.page.locator('tr').filter({ hasText: name }).first();
  }

  async reloadAndExpectRow(name: string) {
    await this.page.waitForTimeout(2500);
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await expect(this.rowByName(name)).toBeVisible({ timeout: 20000 });
  }

  async markAsPaid(name: string) {
    const row = this.rowByName(name);
    await row.getByLabel('Selecionar despesa').check();
    await this.page.getByRole('button', { name: 'Marcar como pago' }).click();
    await expect(row.getByText('Pago')).toBeVisible({ timeout: 20000 });
  }

  async expectStatus(name: string, status: string) {
    await expect(this.rowByName(name).getByText(status)).toBeVisible({ timeout: 20000 });
  }

  async openEdit(name: string) {
    await this.rowByName(name).getByRole('button', { name: 'Editar' }).click();
    await expect(this.page.getByRole('heading', { level: 3, name: 'Editar lançamento' })).toBeVisible();
  }

  async saveExpenseEdit(name: string, amount: string) {
    const form = this.editForm();
    await form.getByLabel('Nome da despesa').fill(name);
    await form.getByLabel('Valor (R$)').fill(amount);
    const response = this.page.waitForResponse((res) => res.request().method() === 'PUT' && res.url().includes('/plans/'));
    await form.getByRole('button', { name: 'Editar despesa' }).click();
    await expect.poll(async () => (await response).ok()).toBeTruthy();
  }

  async openHistory(name: string) {
    await this.rowByName(name).getByRole('button', { name: 'Histórico' }).click();
    await expect(this.page.getByRole('heading', { level: 3, name })).toBeVisible({ timeout: 20000 });
  }

  async tryReversePaymentExpectRejection() {
    const response = this.page.waitForResponse((res) => res.request().method() === 'POST' && res.url().includes('/reversals'));
    await this.page.getByRole('button', { name: 'Estornar pagamento' }).click();
    await expect.poll(async () => (await response).ok()).toBeFalsy();
  }

  async closeHistoryModal() {
    await this.page.getByRole('button', { name: '✕' }).click();
  }

  async expectInvoiceImportAvailable() {
    await expect(this.page.getByRole('button', { name: 'Importar fatura' })).toBeVisible();
  }

  async openInvoiceImport() {
    await this.page.getByRole('button', { name: 'Importar fatura' }).click();
    await expect(this.page.getByRole('heading', { level: 2, name: 'Importar fatura (PDF)' })).toBeVisible();
  }

  async selectDefaultInvoiceCategory(name: string) {
    await this.page.getByLabel('Categoria padrão').selectOption({ label: name });
  }

  async expectInvoiceImportDisabled() {
    await expect(this.page.getByRole('button', { name: 'Salvar fatura' })).toBeDisabled();
  }
}
