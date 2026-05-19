import { expect, type Page } from '@playwright/test';

export class InvestmentsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/investimentos', { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/\/investimentos$/i, { timeout: 20000 });
  }

  async expectAccessControls() {
    await expect(this.page.getByRole('button', { name: 'Importações' })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Novo lançamento' })).toBeVisible();
  }

  async openAnalysisTab() {
    await this.page.getByRole('button', { name: 'Análise' }).click();
    await expect(this.page.getByRole('heading', { name: 'Alocação da carteira' })).toBeVisible();
  }

  async expectSummaryVisible() {
    await expect(this.page.getByText('Patrimônio total')).toBeVisible();
  }

  async createPosition(assetName: string) {
    await this.page.getByRole('button', { name: 'Novo lançamento' }).click();
    await expect(this.page.getByRole('heading', { level: 3, name: 'Adicionar lançamento' })).toBeVisible();
    await this.page.locator('select[name="type"]').selectOption({ index: 1 });
    await this.page.locator('input[name="asset"]').fill(assetName);
    await this.page.locator('input[name="quantity"]').fill('2');
    await this.page.locator('input[name="avgPrice"]').fill('100');
    await this.page.locator('input[name="openedAt"]').fill('2026-03-09');
    await this.page.locator('input[name="account"]').fill('Conta Live Wealth');
    await this.page.locator('input[name="category"]').fill('Renda Fixa');

    const createPositionResponse = this.page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().includes('/investments/positions')
    );
    await this.page.getByRole('button', { name: 'Adicionar lançamento' }).last().click();
    await expect.poll(async () => (await createPositionResponse).ok()).toBeTruthy();

    const closeButton = this.page.locator('.modal__close').first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
    }
  }
}
