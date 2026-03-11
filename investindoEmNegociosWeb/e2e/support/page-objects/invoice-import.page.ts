import { expect, type Page } from '@playwright/test';

export class InvoiceImportPage {
  constructor(private readonly page: Page) {}

  private modal() {
    return this.page.locator('app-invoice-import');
  }

  async expectOpen() {
    await expect(this.modal().getByRole('heading', { level: 2, name: 'Importar fatura (PDF)' })).toBeVisible();
  }

  async uploadPdf(filePath: string) {
    await this.modal().locator('input[type="file"][accept="application/pdf"]').setInputFiles(filePath);
  }

  async expectExtractedPreview(total: string, dueDate: string, itemDescriptions: string[]) {
    await expect(this.modal().getByText('Total').locator('xpath=..').getByText(total, { exact: true })).toBeVisible({ timeout: 20000 });
    await expect(this.modal().getByText('Vencimento').locator('xpath=..').getByText(dueDate, { exact: true })).toBeVisible({ timeout: 20000 });
    for (const description of itemDescriptions) {
      await expect(this.modal().getByRole('cell', { name: description, exact: true })).toBeVisible({ timeout: 20000 });
    }
  }

  async selectCard(cardId: string) {
    const select = this.modal().getByLabel('Cartão destino');
    const optionValue = await select.locator('option').evaluateAll((options, targetCardId) => {
      const match = options.find((option) => option.getAttribute('value')?.endsWith(String(targetCardId)));
      return match?.getAttribute('value') ?? null;
    }, cardId);
    if (!optionValue) {
      throw new Error(`Cartão ${cardId} não encontrado no seletor de importação.`);
    }
    await select.selectOption(optionValue);
  }

  async expectCardOption(cardId: string) {
    await expect(this.modal().getByLabel('Cartão destino').locator(`option[value$="${cardId}"]`)).toBeVisible();
  }

  async selectedCardId() {
    const rawValue = await this.modal().getByLabel('Cartão destino').inputValue();
    return rawValue.replace(/^\d+:\s*/, '');
  }

  async selectDefaultCategory(categoryLabel: string) {
    await this.modal().getByLabel('Categoria padrão').selectOption({ label: categoryLabel });
  }

  async expectSaveEnabled() {
    await expect(this.modal().getByRole('button', { name: 'Salvar fatura' })).toBeEnabled();
  }

  async save() {
    await this.modal().getByRole('button', { name: 'Salvar fatura' }).click();
  }

  async close() {
    await this.modal().getByRole('button', { name: 'Fechar' }).click();
  }
}
