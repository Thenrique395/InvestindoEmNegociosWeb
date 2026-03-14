import { expect, type Page } from '@playwright/test';

export class AssistantPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/assistente', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('heading', { level: 1, name: 'Assistente' })).toBeVisible();
  }

  async expectContextLoaded() {
    await expect(this.page.getByText('SDR', { exact: true })).toBeVisible();
    await expect(this.page.getByText('Dívida', { exact: true })).toBeVisible();
    await expect(this.page.getByText('Patrimônio', { exact: true })).toBeVisible();
    await expect(this.page.getByText('Risco', { exact: true })).toBeVisible();
  }

  async ask(question: string) {
    await this.page.getByLabel('Pergunta').fill(question);
    await this.page.getByRole('button', { name: 'Perguntar' }).click();
  }

  async expectAnswer(question: string, answerSnippet: string) {
    await expect(this.page.getByText(question)).toBeVisible();
    await expect(this.page.getByText(answerSnippet)).toBeVisible();
  }
}
