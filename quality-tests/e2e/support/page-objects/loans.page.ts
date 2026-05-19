import { expect, type Page } from '@playwright/test';

export class LoansPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/emprestimos', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('heading', { level: 1, name: 'Empréstimos' })).toBeVisible();
  }

  async simulate(title: string) {
    await this.page.getByLabel('Título').fill(title);
    await this.page.getByRole('button', { name: 'Simular' }).click();
    await expect(this.page.getByRole('heading', { level: 2, name: 'Simulação' })).toBeVisible();
  }

  async createContract(title: string) {
    await this.page.getByLabel('Título').fill(title);
    await this.page.getByRole('button', { name: 'Criar contrato' }).click();
  }

  async expectSimulationVisible() {
    await expect(this.page.getByText('Parcela inicial')).toBeVisible();
    await expect(this.page.getByText('Custo total')).toBeVisible();
  }

  async expectContractVisible(title: string) {
    await expect(this.page.getByRole('heading', { level: 3, name: title })).toBeVisible();
  }
}
