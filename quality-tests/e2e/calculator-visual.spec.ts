import { expect, test } from '@playwright/test';

test.describe('calculadoras — captura visual rebrand', () => {
  test('salva evidências desktop e mobile do catálogo e de uma calculadora', async ({ page }) => {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1200 },
      { name: 'mobile', width: 390, height: 900 }
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/calculadora', { waitUntil: 'domcontentloaded' });

      await expect(page.getByRole('heading', { level: 1, name: 'Simuladores financeiros e trabalhistas' })).toBeVisible();
      await expect(page.locator('.section-title').filter({ hasText: 'Financeiras' })).toBeVisible();
      await expect(page.locator('.section-title').filter({ hasText: 'Trabalhistas' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Juros Compostos/i })).toBeVisible();

      let overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);

      await page.locator('.calculator').screenshot({
        path: `../docs/ai-reports/calculadoras-rebrand-catalogo-${viewport.name}.png`
      });

      await page.goto('/calculadora/jurosCompostos', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1, name: 'Juros Compostos' })).toBeVisible();
      await page.getByRole('button', { name: 'Calcular' }).click();
      await expect(page.getByText('Valor futuro:')).toBeVisible();
      await expect(page.locator('.chart')).toBeVisible();
      await expect(page.locator('.table').first()).toBeVisible();

      overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);

      await page.locator('.calc__panel').screenshot({
        path: `../docs/ai-reports/calculadoras-rebrand-juros-compostos-${viewport.name}.png`
      });
    }
  });
});
