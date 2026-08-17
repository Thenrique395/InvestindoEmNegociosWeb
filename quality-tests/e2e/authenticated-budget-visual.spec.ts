import { expect, test, type Route } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

async function json(route: Route, body: unknown) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

test.describe('orçamento — captura visual rebrand', () => {
  test('salva evidências desktop e mobile sem overflow horizontal', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Intermediate' });

    await page.route('**/api/v1/budget/**', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      return json(route, {
        year: 2026,
        month: 8,
        totalPlanned: 3200,
        totalRealized: 2750,
        totalVariance: 450,
        items: [
          { id: 'b1', categoryName: 'Moradia', plannedAmount: 1400, realizedAmount: 1320, variance: 80 },
          { id: 'b2', categoryName: 'Alimentação', plannedAmount: 900, realizedAmount: 980, variance: -80 },
          { id: 'b3', categoryName: 'Transporte', plannedAmount: 500, realizedAmount: 260, variance: 240 },
          { id: 'b4', categoryName: 'Lazer', plannedAmount: 400, realizedAmount: 190, variance: 210 }
        ]
      });
    });

    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1200 },
      { name: 'mobile', width: 390, height: 900 }
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/orcamento', { waitUntil: 'domcontentloaded' });

      await expect(page.getByRole('heading', { level: 1, name: /Orçamento ·/ })).toBeVisible();
      await expect(page.getByText('4 categorias neste filtro')).toBeVisible();
      await expect(page.getByLabel('Total exibido no orçamento').getByText('R$ 3.200,00')).toBeVisible();

      const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);

      await page.screenshot({
        path: `../docs/ai-reports/orcamento-rebrand-${viewport.name}.png`,
        fullPage: true
      });

      await page.getByRole('button', { name: 'Adicionar categoria' }).click();
      await expect(page.getByRole('dialog', { name: 'Adicionar categoria' })).toBeVisible();
      await page.screenshot({
        path: `../docs/ai-reports/orcamento-rebrand-add-modal-${viewport.name}.png`,
        fullPage: true
      });
    }
  });
});
