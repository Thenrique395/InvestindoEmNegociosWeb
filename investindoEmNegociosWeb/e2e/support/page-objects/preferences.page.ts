import { expect, type Page } from '@playwright/test';

export class PreferencesPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/preferencias', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('heading', { level: 2, name: 'Configurações pessoais' })).toBeVisible();
  }

  async expectLoaded() {
    await expect(this.page.getByRole('button', { name: /Português \+ BRL/i })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Salvar preferências' })).toBeVisible();
  }

  async saveNotifications(emailEnabled: boolean, daysBeforeDue: string) {
    const checkbox = this.page.getByLabel('Notificações por e-mail');
    if (emailEnabled) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
    await this.page.getByLabel('Dias antes do vencimento para alerta').fill(daysBeforeDue);
    const response = this.page.waitForResponse((res) => res.request().method() === 'PUT' && res.url().includes('/preferences'));
    await this.page.getByRole('button', { name: 'Salvar preferências' }).click();
    return response;
  }
}
