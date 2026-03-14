import { expect, type Page } from '@playwright/test';

export class MonthlySnapshotsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/snapshots', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('heading', { level: 1, name: 'Snapshots mensais' })).toBeVisible();
  }

  async generateCurrentMonth() {
    await this.page.getByRole('button', { name: 'Gerar snapshot do mês' }).click();
  }

  async expectSnapshotVisible(label: string) {
    await expect(this.page.getByRole('heading', { level: 2, name: label })).toBeVisible();
  }
}
