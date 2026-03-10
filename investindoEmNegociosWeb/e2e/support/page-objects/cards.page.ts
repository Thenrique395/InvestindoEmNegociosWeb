import { expect, type Page } from '@playwright/test';

export class CardsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/cartoes', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('heading', { level: 2, name: 'Meus cartões' })).toBeVisible();
  }

  async createCard(holderName: string, last4: string) {
    await this.page.getByRole('button', { name: 'Adicionar cartão' }).first().click();
    await this.page.getByLabel('Número do cartão').fill(`5555 4444 3333 ${last4}`);
    await this.page.getByLabel('Nome impresso no cartão').fill(holderName);
    await this.page.getByLabel('Banco (opcional)').fill('Banco Live');
    await this.page.getByLabel('Limite de crédito').fill('850000');
    await this.page.getByLabel('Dia do fechamento').fill('12');
    await this.page.getByLabel('Dia do vencimento').fill('20');
    await this.page.getByRole('button', { name: 'Salvar cartão' }).click();
  }

  async expectCardVisible(holderName: string, last4: string) {
    await expect(this.page.getByText(holderName)).toBeVisible({ timeout: 20000 });
    await expect(this.page.getByText(`•••• ${last4}`)).toBeVisible({ timeout: 20000 });
    await expect(this.page.getByText('Fatura por competência')).toBeVisible();
  }
}
