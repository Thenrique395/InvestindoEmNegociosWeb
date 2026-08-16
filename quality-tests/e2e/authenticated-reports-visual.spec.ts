import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('relatórios — captura visual rebrand', () => {
  test('salva evidências desktop e mobile com KPIs, barras por categoria e exportação', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Intermediate' });

    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1200 },
      { name: 'mobile', width: 390, height: 900 }
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/relatorios', { waitUntil: 'domcontentloaded' });

      await expect(page.getByRole('heading', { level: 1 })).toContainText(/.+ · \d{4}/);
      await expect(page.getByText('Relatório financeiro').first()).toBeVisible();
      await expect(page.getByText('Receitas', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Despesas', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Saldo líquido', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Taxa de poupança', { exact: true }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Exportar CSV' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Exportar PDF' })).toBeVisible();

      const categoryCard = page.locator('.card').filter({ hasText: 'Despesas por categoria' });
      await expect(categoryCard).toBeVisible();
      const bars = categoryCard.locator('.category-bars');
      await expect(bars).toBeVisible();
      await expect(categoryCard.locator('app-donut-chart')).toHaveCount(0);
      await expect(bars.getByText('Alimentação')).toBeVisible();
      await expect(bars.getByText('Transporte')).toBeVisible();

      const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);

      await page.screenshot({
        path: `../docs/ai-reports/relatorios-rebrand-${viewport.name}.png`,
        fullPage: true
      });
    }
  });
});
