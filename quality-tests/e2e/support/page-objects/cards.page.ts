import { expect, type Locator, type Page } from '@playwright/test';

export class CardsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/cartoes', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('heading', { level: 2, name: /Meus cartões|Seus cartões e ciclos de fatura/i })).toBeVisible();
  }

  async createCard(holderName: string, last4: string) {
    await this.openCreateModal();
    const brandSelect = this.page.getByLabel('Bandeira');
    if (await brandSelect.isVisible().catch(() => false)) {
      await expect(brandSelect.locator('option')).not.toHaveCount(0);
      const firstBrand = await brandSelect.locator('option').first().getAttribute('value');
      if (firstBrand) {
        await brandSelect.selectOption(firstBrand);
      }
    }
    await this.page.getByLabel('Número do cartão').fill(`5555 4444 3333 ${last4}`);
    await this.page.getByLabel(/Nome( impresso)? (do|no) cartão/).fill(holderName);
    await this.page.getByLabel(/Banco( \(opcional\))?/).fill('Banco Live');
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

  card(holderName: string): Locator {
    return this.page.locator('article').filter({
      has: this.page.getByRole('heading', { level: 3, name: holderName })
    }).first();
  }

  async openCreateModal() {
    await this.page.getByRole('button', { name: /Adicionar cartão|Registrar um/i }).first().click();
  }

  async expectCardVisible(holderName: string, last4: string) {
    const card = this.card(holderName);
    await expect(card).toBeVisible({ timeout: 20000 });
    await expect(card.getByText(new RegExp(`${last4}.*${last4}`))).toBeVisible({ timeout: 20000 });
  }

  async reloadAndExpectCardVisible(holderName: string, last4: string) {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.expectCardVisible(holderName, last4);
  }

  async editCard(currentName: string, nextName: string, last4: string) {
    await this.card(currentName).getByRole('button', { name: 'Editar' }).click();
    await this.page.getByLabel('Número do cartão').fill(`9999 8888 7777 ${last4}`);
    await this.page.getByLabel(/Nome( impresso)? (do|no) cartão/).fill(nextName);
    await this.page.getByLabel('Apelido (opcional)').fill(nextName);
    await this.page.getByLabel(/Banco( \(opcional\))?/).fill('Banco Atualizado');
    await this.page.getByLabel('Limite de crédito').fill('9500');
    await this.page.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(this.card(nextName)).toBeVisible({ timeout: 15000 });
    await expect(this.card(nextName).getByText(new RegExp(`${last4}.*${last4}`))).toBeVisible({ timeout: 15000 });
  }

  async removeCard(holderName: string) {
    const deleteResponse = this.page.waitForResponse((response) =>
      response.request().method() === 'DELETE' && response.url().includes('/cards/')
    );
    await this.card(holderName).getByRole('button', { name: 'Remover' }).click();
    await expect.poll(async () => (await deleteResponse).ok()).toBeTruthy();
    await expect(this.page.getByText(holderName)).toHaveCount(0, { timeout: 10000 });
  }
}
