import { expect, type Page } from '@playwright/test';

export class SecurityPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/seguranca', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('heading', { level: 2, name: 'Sessões e login' })).toBeVisible();
  }

  async expectSummaryLoaded() {
    await expect(this.page.getByText('Sessões ativas')).toBeVisible();
    await expect(this.page.getByText('Tentativas inválidas')).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Revogar sessões ativas' })).toBeVisible();
  }

  async revokeSessions() {
    await this.page.getByRole('button', { name: 'Revogar sessões ativas' }).click();
  }

  async expectActiveSessionsCount(value: string) {
    await expect(this.page.locator('.privacy-pill').filter({ hasText: 'Sessões ativas' }).locator('strong')).toHaveText(value);
  }
}
