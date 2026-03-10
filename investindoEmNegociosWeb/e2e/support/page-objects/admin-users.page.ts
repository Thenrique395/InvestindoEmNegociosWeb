import { expect, type Locator, type Page } from '@playwright/test';

export class AdminUsersPage {
  constructor(private readonly page: Page) {}

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
    await expect.poll(async () => (await response).ok()).toBeTruthy();
  }
}
