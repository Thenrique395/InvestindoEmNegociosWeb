import { expect, type Page } from '@playwright/test';

export class SecurityPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/seguranca', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('heading', { level: 2, name: 'Sessões e login' })).toBeVisible();
  }

  async expectPlaceholderState() {
    await expect(this.page.getByText('Em breve: lista de sessões, logout global, 2FA, últimos logins.')).toBeVisible();
  }
}
