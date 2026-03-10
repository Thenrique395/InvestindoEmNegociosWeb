import { expect, type Page } from '@playwright/test';

export class NavigationComponent {
  constructor(private readonly page: Page) {}

  navLink(name: string) {
    return this.page.getByRole('link', { name, exact: true }).first();
  }

  async expectLinkVisible(name: string) {
    await expect(this.navLink(name)).toBeVisible();
  }

  async expectLinkHidden(name: string) {
    await expect(this.navLink(name)).toHaveCount(0);
  }
}
