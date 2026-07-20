import { expect, type Locator, type Page } from '@playwright/test';
import { brl } from '../format';

export class AccountsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/contas', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('heading', { name: /Contas|Controle saldos e transferências/i }).first()).toBeVisible();
  }

  async expectMainAccountVisible() {
    await expect(this.page.getByRole('heading', { level: 3, name: 'Conta principal' })).toBeVisible();
  }

  async tryCreateBasicRestrictedAccount(name: string, initialBalance: string) {
    await this.page.getByLabel(/Nome( da conta)?/).fill(name);
    await this.page.getByLabel('Saldo inicial').fill(initialBalance);
    await this.saveButton().click();
  }

  async expectBasicRestrictionMessage() {
    await expect(this.page.getByText('No plano Basic a conta principal é gerenciada automaticamente. Faça upgrade para criar ou editar contas.')).toBeVisible({ timeout: 20000 });
  }

  async expectAccountNotVisible(name: string) {
    await expect(this.page.getByRole('heading', { level: 3, name })).toHaveCount(0);
  }

  mainAccountCard(): Locator {
    return this.page.locator('article').filter({ hasText: 'Conta principal' });
  }

  accountCard(name: string): Locator {
    return this.page.locator('article').filter({
      has: this.page.getByRole('heading', { level: 3, name })
    }).first();
  }

  async createAccount(name: string, initialBalance: string) {
    await this.page.getByLabel(/Nome( da conta)?/).fill(name);
    await this.page.getByLabel('Saldo inicial').fill(initialBalance);
    await this.saveButton().click();
    await expect(this.accountCard(name)).toBeVisible();
  }

  async expectAccountBalance(name: string, value: number, timeout = 5000) {
    await expect(this.accountCard(name).getByText(brl(value))).toBeVisible({ timeout });
  }

  async transfer(origin: string, destination: string, amount: string, description: string) {
    await this.page.getByLabel('Conta origem').selectOption({ label: origin });
    await this.page.getByLabel('Conta destino').selectOption({ label: destination });
    await this.page.getByLabel('Valor', { exact: true }).fill(amount);
    await this.page.getByLabel('Descrição (opcional)').fill(description);
    await this.page.getByRole('button', { name: 'Transferir agora' }).click();
  }

  async openStatement(name: string) {
    const card = this.accountCard(name);
    await card.getByRole('button', { name: /Extrato|Ver extrato/ }).click();
    await expect(this.page.getByRole('heading', { level: 2, name: new RegExp(`Extrato: ${name}`, 'i') })).toBeVisible();
  }

  async editAccount(currentName: string, nextName: string, initialBalance: string) {
    await this.accountCard(currentName).getByRole('button', { name: 'Editar' }).click();
    await expect(this.page.getByLabel(/Nome( da conta)?/)).toHaveValue(currentName);
    await this.page.getByLabel(/Nome( da conta)?/).fill(nextName);
    await this.page.getByLabel('Saldo inicial').fill(initialBalance);
    await this.saveButton().click();
    await expect(this.accountCard(nextName)).toBeVisible();
  }

  async removeAccount(name: string) {
    await this.accountCard(name).getByRole('button', { name: 'Remover' }).click();
    // Remover conta agora usa um confirm-dialog (não confirm() nativo).
    await this.page.getByRole('dialog').getByRole('button', { name: 'Remover conta' }).click();
    await this.expectAccountNotVisible(name);
  }

  async openMainAccountStatement() {
    await this.openStatement('Conta principal');
  }

  async expectStatementImportEngineVisible() {
    await expect(this.page.getByText('Motor de importação de extrato')).toBeVisible();
    await expect(this.page.getByText(/Saldo atual:/).first()).toBeVisible();
  }

  private saveButton(): Locator {
    return this.page.getByRole('button', { name: /Salvar( conta)?|Criar conta/ }).first();
  }
}
