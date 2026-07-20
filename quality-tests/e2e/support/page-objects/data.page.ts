import { expect, type Download, type Page } from '@playwright/test';

export class DataPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/dados', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('heading', { level: 1, name: 'Exportar / Importar' })).toBeVisible();
  }

  async expectPrivacySectionVisible() {
    await expect(this.page.getByText('Privacidade e exclusão')).toBeVisible();
  }

  async exportData(): Promise<Download> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.getByRole('button', { name: 'Exportar dados' }).click();
    return downloadPromise;
  }

  async deleteAccount(password: string) {
    await this.page.getByLabel('Senha atual').fill(password);
    await this.page.getByLabel('Digite EXCLUIR para confirmar').fill('EXCLUIR');
    await this.page.getByRole('button', { name: 'Excluir minha conta' }).click();
    await this.page.getByRole('button', { name: 'Excluir conta' }).click();
  }
}
