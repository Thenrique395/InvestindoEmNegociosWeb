import { expect, type Page } from '@playwright/test';

export class AdminParametersPage {
  constructor(private readonly page: Page) {}

  private section(title: string) {
    return this.page.locator('div.rounded-2xl, section.rounded-2xl').filter({ hasText: title }).first();
  }

  async goto() {
    await this.page.goto('/admin/parametros', { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/\/admin\/parametros$/i, { timeout: 20000 });
    await expect(this.page.getByRole('heading', { level: 1, name: 'Parâmetros do sistema' })).toBeVisible();
  }

  async createCardBrand(name: string, code: string) {
    const section = this.section('Bandeiras de cartão');
    await section.getByPlaceholder('Nome da bandeira').fill(name);
    await section.getByPlaceholder('Código (ex: visa)').fill(code);
    const response = this.page.waitForResponse((res) => res.request().method() === 'POST' && res.url().includes('/admin/parameters/card-brands'));
    await section.getByRole('button', { name: 'Cadastrar' }).click();
    await response;
  }

  async expectCardBrandVisible(name: string, code: string) {
    const section = this.section('Bandeiras de cartão');
    await expect(section.locator('div').filter({ hasText: name }).filter({ hasText: code }).first()).toBeVisible();
  }

  async expectSuccessMessage(text: string) {
    await expect(this.page.getByText(text)).toBeVisible();
  }

  async saveNotificationDays(value: string) {
    const section = this.section('Notificações globais');
    const incomeDays = section.locator('input[type="number"]').nth(0);
    await incomeDays.fill(value);
    const response = this.page.waitForResponse((res) => res.request().method() === 'PUT' && res.url().includes('/admin/parameters/notification-settings'));
    await section.getByRole('button', { name: 'Salvar regras' }).click();
    const result = await response;
    return result.json();
  }

  async saveRobotSchedule(time: string) {
    const section = this.section('Agendamento de robôs');
    await section.locator('input[type="time"]').fill(time);
    const response = this.page.waitForResponse((res) => res.request().method() === 'PUT' && res.url().includes('/admin/parameters/robot-settings'));
    await section.getByRole('button', { name: 'Salvar agendamento' }).click();
    const result = await response;
    return result.json();
  }

  async expectScalabilitySectionVisible() {
    await expect(this.page.getByText('Escalabilidade por fases')).toBeVisible();
    await expect(this.page.getByText('Fase atual:')).toBeVisible();
  }
}
