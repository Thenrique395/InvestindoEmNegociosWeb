import { expect, type Page } from '@playwright/test';

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await this.expectLoaded();
  }

  async expectLoaded() {
    await expect(this.page.getByRole('heading', { level: 1, name: /Visão geral de/i })).toBeVisible();
  }

  async expectRealBalanceVisible() {
    await expect(this.page.getByText('Saldo Disponível Real')).toBeVisible();
  }

  async expectNetWorthVisible() {
    await expect(this.page.getByText('Patrimônio líquido').first()).toBeVisible();
  }

  async openRiskDetails() {
    await this.page.getByRole('button', { name: 'Detalhes' }).click();
    await expect(this.page.getByText('Painel de risco')).toBeVisible();
  }

  async closeRiskDetails() {
    await this.page.getByRole('button', { name: 'Fechar', exact: true }).click();
  }

  async switchToQuarterly() {
    await this.page.getByRole('button', { name: 'Trimestral' }).click();
    await expect(this.page.getByRole('heading', { level: 1, name: /Trimestre/i })).toBeVisible();
  }

  async switchToYearly() {
    await this.page.getByRole('button', { name: 'Anual' }).click();
    await expect(this.page.getByRole('heading', { level: 1, name: /Ano de/i })).toBeVisible();
  }
}
