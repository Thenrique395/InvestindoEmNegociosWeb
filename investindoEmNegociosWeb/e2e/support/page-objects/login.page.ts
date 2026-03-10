import { expect, type Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/\/login$/);
  }

  async login(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Senha').fill(password);
    await this.page.locator('form').getByRole('button', { name: 'Entrar' }).click();
  }
}
