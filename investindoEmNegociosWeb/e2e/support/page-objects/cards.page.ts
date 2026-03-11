import { expect, type Page } from '@playwright/test';

export class CardsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/cartoes', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('heading', { level: 2, name: 'Meus cartões' })).toBeVisible();
  }

  async createCard(holderName: string, last4: string) {
    await this.page.getByRole('button', { name: 'Adicionar cartão' }).first().click();
    const brandSelect = this.page.getByLabel('Bandeira');
    await expect(brandSelect.locator('option')).not.toHaveCount(0);
    const firstBrand = await brandSelect.locator('option').first().getAttribute('value');
    if (firstBrand) {
      await brandSelect.selectOption(firstBrand);
    }
    await this.page.getByLabel('Número do cartão').fill(`5555 4444 3333 ${last4}`);
    await this.page.getByLabel('Nome impresso no cartão').fill(holderName);
    await this.page.getByLabel('Banco (opcional)').fill('Banco Live');
    await this.page.getByLabel('Limite de crédito').fill('850000');
    await this.page.getByLabel('Dia do fechamento').fill('12');
    await this.page.getByLabel('Dia do vencimento').fill('20');
    const saveButton = this.page.getByRole('button', { name: 'Salvar cartão' });
    await expect(saveButton).toBeEnabled();
    const responsePromise = this.page.waitForResponse((response) =>
      response.url().includes('/api/v1/cards') && response.request().method() === 'POST',
      { timeout: 20000 }
    );
    await saveButton.click();
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
  }

  async expectCardVisible(holderName: string, last4: string) {
    const listing = this.page.locator('app-cartoes-listagem');
    await expect(listing.getByText(holderName, { exact: true })).toBeVisible({ timeout: 20000 });
    await expect(listing.getByText(`•••• ${last4}`, { exact: true })).toBeVisible({ timeout: 20000 });
    await expect(this.page.getByText('Fatura por competência')).toBeVisible();
  }

  async reloadAndExpectCardVisible(holderName: string, last4: string) {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.expectCardVisible(holderName, last4);
  }
}
