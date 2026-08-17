import { expect, type Page } from '@playwright/test';

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await this.expectLoaded();
  }

  async expectLoaded() {
    await expect(this.page.getByRole('heading', { level: 1, name: /Visão Geral Financeira/i })).toBeVisible();
  }

  async expectRealBalanceVisible() {
    await expect(this.page.getByText('Saldo disponível').first()).toBeVisible();
  }

  async expectNetWorthVisible() {
    await expect(this.page.getByText('Patrimônio líquido').first()).toBeVisible();
  }

  async expectAccountBalancesVisible() {
    // O bloco "Saldos por conta" foi absorvido pelo card de patrimônio no refactor;
    // verificamos o saldo disponível local (calculado a partir das contas).
    await expect(this.page.getByText('Saldo disponível').first()).toBeVisible();
  }

  async expectNetWorthHistoryVisible() {
    await expect(this.page.getByText('Evolução patrimonial')).toBeVisible();
  }

  async expectDebtMapVisible() {
    await expect(this.page.getByRole('heading', { name: 'Dívidas e contas' }).first()).toBeVisible();
  }

  async expectInvestmentsVisible() {
    await expect(this.page.getByRole('heading', { name: 'Investimentos' }).first()).toBeVisible();
  }

  // O painel de risco detalhado e a troca de período por heading foram removidos no
  // refactor do dashboard; a saúde financeira agora é um card no overview.
  async expectHealthVisible() {
    await expect(this.page.getByRole('heading', { name: 'Saúde financeira (IA)' }).first()).toBeVisible();
  }

  async expectNoHorizontalOverflow() {
    const overflow = await this.page.evaluate(() => {
      const documentElement = document.documentElement;
      const body = document.body;

      return Math.max(documentElement.scrollWidth, body.scrollWidth) - window.innerWidth;
    });

    expect(overflow).toBeLessThanOrEqual(1);
  }
}
