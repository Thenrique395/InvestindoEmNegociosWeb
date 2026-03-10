import { expect, type Page } from '@playwright/test';

export class ProfilePage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/perfil', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('heading', { level: 2, name: 'Dados do usuário' })).toBeVisible();
  }

  async expectDefaultProfileData() {
    await expect(this.page.getByLabel('Nome')).toHaveValue('Codex Live Usuario');
    await expect(this.page.getByLabel('Cidade')).toHaveValue('Recife');
    await expect(this.page.getByLabel('Estado')).toHaveValue('PE');
    await expect(this.page.getByLabel('País')).toHaveValue('Brasil');
    await expect(this.page.getByLabel('Modo de inteligência')).toHaveValue('B');
  }
}
