import { expect, type Locator, type Page } from '@playwright/test';

export class AccountsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/contas', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('heading', { level: 1, name: 'Contas' })).toBeVisible();
  }

  async expectMainAccountVisible() {
    await expect(this.page.getByRole('heading', { level: 3, name: 'Conta principal' })).toBeVisible();
  }

  async tryCreateBasicRestrictedAccount(name: string, initialBalance: string) {
    await this.page.getByLabel('Nome').fill(name);
    await this.page.getByLabel('Saldo inicial').fill(initialBalance);
    await this.page.getByRole('button', { name: 'Criar conta' }).click();
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

  async openMainAccountStatement() {
    await this.mainAccountCard().getByRole('button', { name: 'Ver extrato' }).click();
    await expect(this.page.getByRole('heading', { level: 2, name: /Extrato: Conta principal/i })).toBeVisible();
  }

  async expectStatementImportEngineVisible() {
    await expect(this.page.getByText('Motor de importação de extrato')).toBeVisible();
    await expect(this.page.getByText(/Saldo atual:/).first()).toBeVisible();
  }
}
