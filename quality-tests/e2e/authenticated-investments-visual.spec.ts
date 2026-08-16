import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

test.describe('investimentos — captura visual rebrand', () => {
  test('salva evidências desktop e mobile do resumo e consolidação sem overflow horizontal', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Advanced' });

    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1200 },
      { name: 'mobile', width: 390, height: 900 }
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/investimentos', { waitUntil: 'domcontentloaded' });

      await expect(page.getByRole('heading', { level: 1, name: /Carteira e evolução/ })).toBeVisible();
      await page.getByRole('radio', { name: 'Resumo' }).click();
      const summary = page.locator('app-investment-overview-panel');
      await expect(summary.getByText('Valor de mercado', { exact: true })).toBeVisible();
      await expect(summary.getByText('Total investido', { exact: true })).toBeVisible();
      await expect(summary.getByText('Valorização', { exact: true })).toBeVisible();
      await expect(summary.getByText('Proventos (12m)', { exact: true })).toBeVisible();
      await expect(summary.getByText('Aporte do mês', { exact: true })).toBeVisible();
      await expect(page.getByRole('option', { name: '24 meses' })).toBeAttached();
      await expect(page.getByRole('heading', { name: 'Posições' })).toBeVisible();
      await expect(page.getByText('Sem cotação de mercado, o valor cai para o preço médio')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Todos' })).toBeVisible();
      await expect(page.getByText('Preço médio', { exact: true }).first()).toBeVisible();
      await expect(page.getByLabel('Total das posições filtradas')).toBeVisible();
      await expect(page.getByText('Fonte dos preços')).toBeVisible();

      if (viewport.name === 'mobile') {
        const positions = page.locator('#sec-posicoes');
        await expect(positions.locator('.responsive-list__item[data-label="Ativo"]').first()).toBeVisible();
        await expect(positions.locator('.responsive-list__item[data-label="Qtd."]').first()).toBeVisible();
        await expect(positions.locator('.responsive-list__item[data-label="Investido"]').first()).toBeVisible();
        await expect(positions.locator('.responsive-list__item[data-label="Mercado"]').first()).toBeVisible();
        await expect(positions.getByRole('button', { name: 'Novo lançamento' }).first()).toBeVisible();
      }

      const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);

      await page.screenshot({
        path: `../docs/ai-reports/investimentos-rebrand-resumo-${viewport.name}.png`,
        fullPage: true
      });

      await page.getByRole('radio', { name: 'Consolidação' }).click();
      const consolidation = page.locator('app-investment-consolidation-panel');
      await expect(consolidation.getByRole('heading', { name: 'Consolidação de aportes' })).toBeVisible();
      await expect(consolidation.getByText('sem misturar proventos')).toBeVisible();
      await expect(consolidation.getByLabel('Resumo da consolidação')).toBeVisible();
      await expect(consolidation.getByText('Compras', { exact: true }).first()).toBeVisible();
      await expect(consolidation.getByText('Vendas', { exact: true }).first()).toBeVisible();
      await expect(consolidation.getByText('Saldo', { exact: true })).toBeVisible();
      await expect(consolidation.getByText('Lançamentos', { exact: true })).toBeVisible();
      await expect(consolidation.getByText('Tesouro IPCA+ 2029')).toBeVisible();

      const consolidationOverflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
      expect(consolidationOverflow).toBeLessThanOrEqual(1);

      await page.screenshot({
        path: `../docs/ai-reports/investimentos-rebrand-consolidacao-${viewport.name}.png`,
        fullPage: true
      });

      await page.getByRole('radio', { name: 'Proventos' }).click();
      const dividends = page.locator('app-investment-dividends-panel');
      await expect(dividends.getByRole('heading', { name: 'Proventos por mês' })).toBeVisible();
      await expect(dividends.getByText('Dividendos, JCP e rendimentos recebidos nos últimos 12 meses.')).toBeVisible();
      await expect(dividends.getByLabel('Proventos dos últimos 12 meses')).toBeVisible();
      await expect(dividends.getByLabel('Resumo dos proventos')).toBeVisible();
      await expect(dividends.getByText('Total em 12 meses')).toBeVisible();
      await expect(dividends.getByText('Média mensal')).toBeVisible();
      await expect(dividends.getByText('Ativos pagadores')).toBeVisible();
      await expect(dividends.getByRole('heading', { name: 'Por ativo' })).toBeVisible();
      await expect(dividends.getByText('Acumulado de 12 meses.')).toBeVisible();
      await expect(dividends.getByText('IVVB11')).toBeVisible();
      await expect(dividends.getByText('Tesouro IPCA+ 2029')).toBeVisible();

      const dividendsOverflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
      expect(dividendsOverflow).toBeLessThanOrEqual(1);

      await page.screenshot({
        path: `../docs/ai-reports/investimentos-rebrand-proventos-${viewport.name}.png`,
        fullPage: true
      });

      await page.getByRole('radio', { name: 'Rentabilidade' }).click();
      const profitability = page.locator('app-investment-profitability-panel');
      await expect(profitability.getByRole('heading', { name: 'Carteira contra índice' })).toBeVisible();
      await expect(profitability.getByText('Rentabilidade acumulada sobre o valor investido.')).toBeVisible();
      await expect(profitability.getByLabel('Benchmarks')).toBeVisible();
      for (const benchmark of ['CDI', 'IPCA', 'IFIX', 'IBOV', 'SMLL', 'IDIV', 'IVVB11']) {
        await expect(profitability.getByRole('button', { name: benchmark })).toBeVisible();
      }
      await profitability.getByRole('button', { name: 'IPCA' }).click();
      await expect(profitability.getByRole('button', { name: 'IPCA' })).toHaveAttribute('aria-pressed', 'true');
      const profitabilitySummary = profitability.getByLabel('Resumo da rentabilidade');
      await expect(profitabilitySummary).toBeVisible();
      await expect(profitabilitySummary.getByText('Desde o início')).toBeVisible();
      await expect(profitabilitySummary.getByText('12 meses')).toBeVisible();
      await expect(profitabilitySummary.getByText('Último mês')).toBeVisible();
      await expect(profitability.getByLabel('Evolução de rentabilidade da carteira e índice')).toBeVisible();
      await expect(profitability.getByRole('heading', { name: 'Por ano' })).toBeVisible();

      const profitabilityOverflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
      expect(profitabilityOverflow).toBeLessThanOrEqual(1);

      await page.screenshot({
        path: `../docs/ai-reports/investimentos-rebrand-rentabilidade-${viewport.name}.png`,
        fullPage: true
      });

      await page.getByRole('radio', { name: 'Análise' }).click();
      const analysis = page.locator('app-investment-analysis-panel');
      await expect(analysis.getByText('Próxima ação')).toBeVisible();
      await expect(analysis.getByText('Tipo mais distante do alvo')).toBeVisible();
      await expect(analysis.getByText('Valor sugerido')).toBeVisible();
      await expect(analysis.getByText('Não é recomendação de ativos.')).toBeVisible();
      await expect(analysis.getByRole('heading', { name: 'Alocação da carteira' })).toBeVisible();
      await expect(analysis.getByRole('heading', { name: 'Alocação alvo' })).toBeVisible();
      await expect(analysis.getByText('Defina a distribuição desejada. A soma precisa fechar em 100%.')).toBeVisible();
      await expect(analysis.getByText(/Soma: .*%/)).toBeVisible();
      await expect(analysis.getByText('Desvio', { exact: true })).toBeAttached();
      await expect(analysis.getByRole('button', { name: 'Editar alvo' })).toBeVisible();
      await expect(analysis.getByRole('button', { name: 'Salvar alocação' })).toBeVisible();

      const analysisOverflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
      expect(analysisOverflow).toBeLessThanOrEqual(1);

      await page.screenshot({
        path: `../docs/ai-reports/investimentos-rebrand-analise-${viewport.name}.png`,
        fullPage: true
      });
    }
  });
});
