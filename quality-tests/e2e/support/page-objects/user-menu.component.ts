import { type Page } from '@playwright/test';

export class UserMenuComponent {
  constructor(private readonly page: Page) {}

  async open() {
    const trigger = this.page.locator('.user-menu .user-trigger').first();
    if (await trigger.isVisible().catch(() => false)) {
      await trigger.click();
      return;
    }

    const avatarToggle = this.page.locator('button').filter({ has: this.page.locator('img[alt*="Avatar"]') }).first();
    if (await avatarToggle.isVisible().catch(() => false)) {
      await avatarToggle.click();
      return;
    }

    await this.page.getByRole('button', { name: /codex live usuario|usuário|▾/i }).first().click();
  }

  async logout() {
    await this.open();
    await this.page.getByRole('button', { name: 'Sair' }).click();
  }
}
