import { expect, type Page } from '@playwright/test';

export class GoalsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/metas', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('heading', { level: 2, name: 'Metas anuais' })).toBeVisible();
  }

  async createGoal(name: string) {
    const createResponse = this.page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().includes('/goals')
    );
    await this.page.getByRole('button', { name: 'Adicionar meta' }).click();
    await this.page.getByLabel('Nome da meta').fill(name);
    await this.page.getByLabel('Valor da meta (R$)').fill('120000');
    await this.page.getByLabel('Aporte mensal previsto (R$)').fill('10000');
    await this.page.getByLabel('Data de vencimento (DD/MM/AAAA)').fill('31122026');
    await this.page.getByRole('textbox', { name: 'Ano' }).fill('2026');
    await this.page.getByRole('button', { name: 'Salvar meta' }).click();
    await expect.poll(async () => (await createResponse).ok()).toBeTruthy();
  }

  async expectGoalVisible(name: string) {
    await expect(this.page.getByText(name)).toBeVisible({ timeout: 20000 });
  }

  async reloadAndExpectGoalVisible(name: string) {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.expectGoalVisible(name);
  }
}
