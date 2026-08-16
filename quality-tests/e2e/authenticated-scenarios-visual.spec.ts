import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('simulador — captura visual rebrand', () => {
  test('salva evidências desktop e mobile com sliders, gráfico comparado e detalhamento', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Intermediate' });

    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1200 },
      { name: 'mobile', width: 390, height: 900 }
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/simulador', { waitUntil: 'domcontentloaded' });

      await expect(page.getByRole('heading', { level: 1, name: 'Simulador de cenários' })).toBeVisible();
      await expect(page.getByText('Receita extra mensal')).toBeVisible();
      await expect(page.getByText('Despesa extra mensal')).toBeVisible();
      await expect(page.getByText('Taxa de poupança (%)')).toBeVisible();

      await page.getByLabel('Receita extra mensal').fill('1200');
      await page.getByLabel('Despesa extra mensal').fill('300');
      await page.getByLabel('Taxa de poupança (%)').fill('8');
      await page.getByRole('radio', { name: '6 meses' }).click();
      await page.getByRole('button', { name: 'Simular cenário' }).click();

      await expect(page.getByText('Saldo projetado (base)')).toBeVisible();
      await expect(page.getByText('Saldo projetado (cenário)')).toBeVisible();
      await expect(page.getByRole('heading', { level: 2, name: 'Projeção comparada' })).toBeVisible();
      await expect(page.locator('.scenario-chart')).toBeVisible();
      await expect(page.locator('.scenario-chart__point')).toHaveCount(7);
      await expect(page.getByRole('heading', { level: 2, name: 'Detalhamento da projeção' })).toBeVisible();

      const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);

      await page.screenshot({
        path: `../docs/ai-reports/simulador-rebrand-${viewport.name}.png`,
        fullPage: true
      });
    }
  });
});
