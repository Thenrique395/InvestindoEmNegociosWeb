import { expect, type Page } from '@playwright/test';

export class AdminRobotsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/admin/robots', { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/\/admin\/robots$/i, { timeout: 20000 });
    await expect(this.page.getByRole('heading', { level: 1, name: 'Monitor de Robôs' })).toBeVisible();
  }

  async expectRunAllAvailable() {
    await expect(this.page.getByRole('button', { name: 'Executar todos' })).toBeVisible();
  }
}
