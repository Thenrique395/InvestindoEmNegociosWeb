import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('empréstimos — captura visual rebrand', () => {
  test('salva evidências desktop e mobile com KPIs e amortização sem overflow horizontal', async ({ page }) => {
    test.setTimeout(60000);
    await setupAuthenticatedApp(page, { role: 'Intermediate' });

    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto('/emprestimos', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Novo contrato' }).click();
    await page.getByLabel('Título').fill('Financiamento imobiliário');
    await page.getByRole('button', { name: 'Simular', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Simulação' })).toBeVisible();
    await page.getByRole('button', { name: 'Criar contrato' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Financiamento imobiliário' })).toBeVisible();
    const detailHref = await page.getByRole('link', { name: 'Ver detalhes' }).first().getAttribute('href');
    expect(detailHref).toBeTruthy();

    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1200 },
      { name: 'mobile', width: 390, height: 900 }
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/emprestimos', { waitUntil: 'domcontentloaded' });

      await expect(page.getByRole('heading', { level: 1, name: 'Empréstimos e financiamentos' })).toBeVisible();
      const summary = page.locator('.loans-summary-grid');
      await expect(summary.getByText('Saldo devedor', { exact: true })).toBeVisible();
      await expect(summary.getByText('Parcela mensal', { exact: true })).toBeVisible();
      await expect(summary.getByText('Próximo vencimento', { exact: true })).toBeVisible();
      await expect(summary.getByText('Quitação prevista', { exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { level: 3, name: 'Financiamento imobiliário' })).toBeVisible();
      await expect(page.getByText(/de 3 parcelas quitadas/)).toBeVisible();
      await expect(page.getByText(/Próxima parcela 1 em/)).toBeVisible();
      await expect(page.getByText('Taxa', { exact: true })).toBeVisible();
      await expect(page.getByText('18% a.a.', { exact: true })).toBeVisible();
      await expect(page.getByText('Vencimento', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Pagar parcela' })).toBeVisible();

      const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);

      await page.screenshot({
        path: `../docs/ai-reports/emprestimos-rebrand-${viewport.name}.png`,
        fullPage: true
      });

      await page.goto(detailHref!, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1, name: 'Financiamento imobiliário' })).toBeVisible();
      await expect(page.getByText('Próximo vencimento', { exact: true })).toBeVisible();
      await expect(page.getByText('Quitação prevista', { exact: true })).toBeVisible();
      const detailsCard = page.locator('.card').filter({ hasText: 'Detalhes do contrato' });
      await expect(detailsCard).toBeVisible();
      await expect(detailsCard.getByText('Taxa anual')).toBeVisible();
      await expect(detailsCard.getByText('18% a.a.', { exact: true })).toBeVisible();
      await page.screenshot({
        path: `../docs/ai-reports/emprestimos-rebrand-detalhe-resumo-${viewport.name}.png`,
        fullPage: true
      });

      await page.getByRole('radio', { name: 'Parcelas' }).click();
      await expect(page.getByText('Cronograma de parcelas')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Pagar próxima parcela' })).toBeVisible();
      await expect(page.getByText('Saldo inicial')).toBeVisible();
      await expect(page.getByText('Saldo final')).toBeVisible();
      const detailOverflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
      expect(detailOverflow).toBeLessThanOrEqual(1);
      await page.screenshot({
        path: `../docs/ai-reports/emprestimos-rebrand-detalhe-parcelas-${viewport.name}.png`,
        fullPage: true
      });
    }
  });
});
