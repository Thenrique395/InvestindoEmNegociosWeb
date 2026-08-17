import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('relatórios — captura visual rebrand', () => {
  test('salva evidências desktop e mobile com resumo, comparativo e exportação', async ({ page }) => {
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
      await expect(page.getByRole('button', { name: 'Resumo mensal' })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('button', { name: 'Comparativo' })).toBeVisible();
      await expect(page.getByRole('button', { name: '6 meses' })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('button', { name: '12 meses' })).toBeVisible();

      const categoryCard = page.locator('.card').filter({ hasText: 'Despesas por categoria' });
      await expect(categoryCard).toBeVisible();
      const bars = categoryCard.locator('.category-bars');
      await expect(bars).toBeVisible();
      await expect(categoryCard.locator('app-donut-chart')).toHaveCount(0);
      await expect(bars.getByText('Alimentação')).toBeVisible();
      await expect(bars.getByText('Transporte')).toBeVisible();

      let overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);

      await page.screenshot({
        path: `../docs/ai-reports/relatorios-rebrand-${viewport.name}.png`,
        fullPage: true
      });

      await page.getByRole('button', { name: 'Comparativo' }).click();
      await expect(page.getByRole('button', { name: 'Comparativo' })).toHaveAttribute('aria-pressed', 'true');
      const comparisonCard = page.locator('.comparison-card');
      await expect(comparisonCard).toBeVisible();
      await expect(comparisonCard.getByRole('heading', { name: 'Receitas × despesas' })).toBeVisible();
      await expect(comparisonCard.locator('.balance-evolution')).toBeVisible();
      await expect(comparisonCard.locator('.comparison-month')).toHaveCount(6);

      await page.getByRole('button', { name: '12 meses' }).click();
      await expect(page.getByRole('button', { name: '12 meses' })).toHaveAttribute('aria-pressed', 'true');
      await expect(comparisonCard.locator('.comparison-month')).toHaveCount(12);

      overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);

      await comparisonCard.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `../docs/ai-reports/relatorios-rebrand-comparativo-${viewport.name}.png`,
        fullPage: false
      });
    }
  });
});
