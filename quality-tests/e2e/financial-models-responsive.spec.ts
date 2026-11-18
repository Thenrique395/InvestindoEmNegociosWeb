import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';
import { BaseDespesas } from './support/despesas-backend';

for (const width of [390, 1024, 1440]) {
  for (const route of ['dashboard', 'despesas']) {
    test(`${route} mantém leitura e renderização em ${width}px`, async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: 900 });
      await page.clock.install({ time: new Date('2026-03-15T12:00:00-03:00') });
      await setupAuthenticatedApp(page, { role: 'Advanced' });
      const base = new BaseDespesas();
      base.addPlano({ title: 'Conta de regressão', amount: 250, startDate: '2026-03-05', schedule: 'Recurring' }, [{ dueDate: '2026-03-05' }]);
      await base.instalar(page);
      await page.goto(`/${route}`, { waitUntil: 'domcontentloaded' });
      if (route === 'dashboard') {
        await expect(page.getByRole('heading', { level: 1, name: /Bom dia|Boa tarde|Boa noite/ })).toBeVisible();
        await expect(page.getByText('Saldo disponível', { exact: true }).first()).toBeVisible();
      } else if (width === 390) {
        await expect(page.getByText('Total de março de 2026', { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Novo lançamento', exact: true })).toBeVisible();
        await expect(page.locator('app-tx-mobile-list').getByText('Conta de regressão', { exact: true })).toBeVisible();
      } else {
        await expect(page.getByRole('heading', { name: /Despesas/ }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: 'Adicionar despesa' }).first()).toBeVisible();
        await expect(page.getByRole('row', { name: /Conta de regressão/ })).toBeVisible();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${route}-${width}.png`), fullPage: true, animations: 'disabled' });
      expect(errors).toEqual([]);
    });
  }
}
