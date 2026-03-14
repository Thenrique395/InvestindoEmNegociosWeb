import { expect, type Locator, type Page } from '@playwright/test';

export class AdminUsersPage {
  constructor(private readonly page: Page) {}

  private featureModeLabel(mode: 'inherit' | 'enabled' | 'disabled'): string {
    if (mode === 'enabled') return 'Habilitar';
    if (mode === 'disabled') return 'Bloquear';
    return 'Padrão';
  }

  async goto() {
    await this.page.goto('/admin/usuarios', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('heading', { level: 1, name: 'Controle de acessos' })).toBeVisible();
  }

  rowByEmail(email: string): Locator {
    return this.page.locator('tr').filter({ hasText: email }).first();
  }

  async expectUserVisible(email: string) {
    await expect(this.page.getByText(email)).toBeVisible();
  }

  async expectRole(email: string, role: string) {
    await expect(this.rowByEmail(email).locator('select').first()).toHaveValue(role);
  }

  async changeRole(email: string, role: string) {
    const row = this.rowByEmail(email);
    await expect(row).toBeVisible({ timeout: 20000 });
    await row.locator('select').first().selectOption(role);
    const response = this.page.waitForResponse((resp) =>
      resp.request().method() === 'PUT' &&
      resp.url().includes('/admin/users/') &&
      resp.url().includes('/role')
    );
    await row.getByRole('button', { name: 'Salvar' }).click();
    return response;
  }

  async openFeatures(email: string) {
    const row = this.rowByEmail(email);
    await expect(row).toBeVisible({ timeout: 20000 });
    await row.getByRole('button', { name: 'Gerenciar' }).click();
    await expect(this.page.getByText('Base perfil:', { exact: false }).first()).toBeVisible();
  }

  async setFeatureMode(featureLabel: string, mode: 'inherit' | 'enabled' | 'disabled') {
    const row = this.page.locator('label').filter({ hasText: featureLabel }).first();
    await expect(row).toBeVisible();
    const response = this.page.waitForResponse((resp) =>
      (resp.request().method() === 'PUT' || resp.request().method() === 'DELETE') &&
      resp.url().includes('/admin/users/') &&
      resp.url().includes('/features/')
    );
    await row.locator('select').selectOption({ label: this.featureModeLabel(mode) });
    return response;
  }

  async requestDeleteUser(email: string) {
    const row = this.rowByEmail(email);
    await expect(row).toBeVisible({ timeout: 20000 });
    await row.getByRole('button', { name: 'Excluir' }).click();
    await expect(this.page.getByText('Excluir usuário', { exact: true })).toBeVisible();
  }

  async confirmDeleteUser() {
    const response = this.page.waitForResponse((resp) =>
      resp.request().method() === 'DELETE' &&
      resp.url().includes('/admin/users/')
    );
    await this.page.getByRole('button', { name: 'Excluir' }).last().click();
    return response;
  }

  async expectFeatureMode(featureLabel: string, mode: 'inherit' | 'enabled' | 'disabled') {
    const row = this.page.locator('label').filter({ hasText: featureLabel }).first();
    await expect
      .poll(async () => row.locator('select').evaluate((element) => (element as HTMLSelectElement).selectedOptions[0]?.textContent?.trim() || ''))
      .toBe(this.featureModeLabel(mode));
  }
}
