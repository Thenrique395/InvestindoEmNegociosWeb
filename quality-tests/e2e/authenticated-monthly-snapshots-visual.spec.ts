import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('histórico mensal — captura visual rebrand', () => {
  test('salva evidências desktop e mobile com fechamento mensal e geração de snapshot', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Intermediate' });

    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1200 },
      { name: 'mobile', width: 390, height: 900 }
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/snapshots', { waitUntil: 'domcontentloaded' });

      await expect(page.getByRole('heading', { level: 1, name: 'Histórico mensal' })).toBeVisible();
      await expect(page.getByText('Fechamento mais recente')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Gerar snapshot do mês' })).toBeVisible();
      const summary = page.locator('.snapshots-summary-grid');
      await expect(summary.getByText('SDR atual')).toBeVisible();
      await expect(summary.getByText('Projeção')).toBeVisible();
      await expect(summary.getByText('Pendências')).toBeVisible();
      await expect(summary.getByText('Dívida')).toBeVisible();
      await expect(summary.getByText('Risco')).toBeVisible();
      const firstSnapshot = page.locator('.snapshot').first();
      await expect(firstSnapshot).toBeVisible();
      await expect(firstSnapshot.getByText('Patrimônio')).toBeVisible();

      await page.getByRole('button', { name: 'Gerar snapshot do mês' }).click();
      await expect(firstSnapshot).toContainText(/\/2026/);
      await expect(firstSnapshot).toContainText('Snapshot gerado com sucesso');

      const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);

      await page.screenshot({
        path: `../docs/ai-reports/monthly-snapshots-rebrand-${viewport.name}.png`,
        fullPage: true
      });
    }
  });
});
