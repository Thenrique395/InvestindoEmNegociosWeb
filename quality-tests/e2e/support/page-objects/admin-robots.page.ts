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

  async runAll() {
    const response = this.page.waitForResponse((res) => res.request().method() === 'POST' && res.url().includes('/admin/robots/run-all'));
    await this.page.getByRole('button', { name: 'Executar todos' }).first().click();
    // Executar todos agora exige confirmação num diálogo.
    await this.page.getByRole('dialog').getByRole('button', { name: 'Executar todos' }).click();
    await response;
  }

  async runRobot(robotName: string) {
    const row = this.page.locator('tr').filter({ hasText: robotName }).first();
    await expect(row).toBeVisible();
    const response = this.page.waitForResponse((res) => res.request().method() === 'POST' && res.url().includes(`/admin/robots/run/${encodeURIComponent(robotName)}`));
    await row.getByRole('button', { name: 'Executar' }).click();
    await response;
  }

  async openDetails(robotName: string) {
    const row = this.page.locator('tr').filter({ hasText: robotName }).first();
    await row.getByRole('button', { name: 'Detalhe' }).click();
    await expect(this.page.getByText('Contexto técnico')).toBeVisible();
  }

  async expectRobotRunVisible(robotName: string) {
    await expect(this.page.locator('tr').filter({ hasText: robotName }).first()).toBeVisible();
  }
}
