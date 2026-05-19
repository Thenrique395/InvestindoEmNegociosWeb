import { expect, type Page } from '@playwright/test';

export class SubscriptionsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/planos', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('heading', { level: 2, name: 'Assinatura e monetização' })).toBeVisible();
  }

  planCard(name: string) {
    return this.page.locator('.plan-card').filter({ has: this.page.getByRole('heading', { level: 3, name }) }).first();
  }

  async switchToYearly() {
    await this.page.getByRole('button', { name: 'Anual' }).click();
  }

  async changeTo(name: string) {
    await this.planCard(name).getByRole('button', { name: 'Trocar para este plano' }).click();
  }

  async cancelRenewal() {
    await this.page.getByRole('button', { name: 'Cancelar renovação' }).click();
  }

  async expectCurrentPlan(name: string) {
    await expect(this.page.locator('.privacy-pill strong').first()).toHaveText(name);
    await expect(this.planCard(name).getByRole('button', { name: 'Plano atual' })).toBeVisible();
  }

  async expectAutoRenewStatus(status: string) {
    await expect(this.page.locator('.privacy-pill').filter({ hasText: 'Renovação' }).locator('strong')).toHaveText(status);
  }
}
