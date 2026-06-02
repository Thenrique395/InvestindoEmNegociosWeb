import { expect, type Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/\/login$/);
  }

  async login(email: string, password: string) {
    await this.page.getByLabel('E-mail').fill(email);
    await this.page.getByPlaceholder('Digite sua senha').fill(password);
    await this.page.locator('form').getByRole('button', { name: /Entrar no dashboard/i }).click();
  }
}
