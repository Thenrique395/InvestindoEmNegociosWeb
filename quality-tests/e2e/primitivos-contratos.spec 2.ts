/**
 * Guarda dos contratos que substituíram `::ng-deep` e SVG desenhado à mão nas
 * features (ARQUITETURA_ANGULAR.md §6, §7, §8):
 *
 * - `app-chart-line` no lugar de `<polyline>`/`<polygon>` em Investimentos e Empréstimos
 * - `ResponsiveListColumn.width/minWidth` (valor) no lugar de `widthClass` + `::ng-deep`
 * - `responsive-list` com `density="comfortable"` e coluna `actions`
 * - `app-donut-chart [compact]`
 * - cor de tom por token em vez de classe utilitária literal, nos dois temas
 *
 * Cada asserção aqui existe porque a regra correspondente já quebrou uma vez.
 */
import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

const OUT = '../docs/ai-reports/primitivos';

test.use({ deviceScaleFactor: 2 });

test.describe('contratos dos primitivos', () => {
  test('investimentos: gráfico de rentabilidade pelo primitivo', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Advanced' });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/investimentos', { waitUntil: 'domcontentloaded' });
    await page.getByRole('radio', { name: 'Rentabilidade' }).click();

    const chart = page.locator('app-chart-line').first();
    await expect(chart).toBeVisible();
    await chart.screenshot({ path: `${OUT}/investimentos-chart.png` });

    // A série de comparação tem que sair tracejada (contrato do primitivo).
    const dashArray = await page.locator('.line__series--dashed').first()
      .evaluate((el) => getComputedStyle(el).strokeDasharray);
    console.log('BENCHMARK strokeDasharray =', dashArray);
    expect(dashArray).not.toBe('none');
  });

  test('orçamento: donut compacto + tabela confortável', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Advanced' });

    // O mock padrão traz orçamento vazio; aqui interessa o estado COM dados,
    // que é o que exercita a densidade da tabela e o donut compacto.
    await page.route('**/api/v1/budget/**', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      const items = [
        { id: 'b1', categoryId: 'c1', categoryName: 'Mercado', plannedAmount: 1200, realizedAmount: 1450, variance: -250 },
        { id: 'b2', categoryId: 'c2', categoryName: 'Transporte', plannedAmount: 600, realizedAmount: 380, variance: 220 },
        { id: 'b3', categoryId: 'c3', categoryName: 'Lazer', plannedAmount: 400, realizedAmount: 410, variance: -10 },
        { id: 'b4', categoryId: 'c4', categoryName: 'Saúde', plannedAmount: 300, realizedAmount: 120, variance: 180 }
      ];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          year: 2026, month: 8,
          totalPlanned: 2500, totalRealized: 2360, totalVariance: 140,
          items
        })
      });
    });

    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto('/orcamento', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Mercado').first()).toBeVisible();
    await page.screenshot({ path: `${OUT}/orcamento.png`, fullPage: true });

    // donut compacto: 148px, não os 220px do padrão, e empilhado em 1 coluna
    const size = await page.locator('.donut').first().evaluate((el) => getComputedStyle(el).width);
    console.log('DONUT width =', size);
    expect(size).toBe('148px');

    // densidade confortável na tabela
    const h = await page.locator('.budget-table .responsive-list__item').first()
      .evaluate((el) => getComputedStyle(el).height);
    console.log('BUDGET item height =', h);
    expect(h).toBe('56px');

    // largura da coluna "Uso" agora vem por valor, não por classe furada
    const w = await page.locator('.budget-table th', { hasText: 'Uso' }).first()
      .evaluate((el) => (el as HTMLElement).style.width);
    console.log('USO column inline width =', w);
    expect(w).toBe('28%');

    await page.locator('.budget-table').screenshot({ path: `${OUT}/orcamento-tabela.png` });
  });

  test('relatórios: largura da coluna por valor', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Advanced' });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/relatorios', { waitUntil: 'domcontentloaded' });

    const th = page.locator('th', { hasText: 'Participação' }).first();
    await expect(th).toBeVisible();
    const w = await th.evaluate((el) => (el as HTMLElement).style.width);
    console.log('SHARE column inline width =', w);
    expect(w).toBe('32%');
  });

  test('home: tons de indicador vindos de token', async ({ page }) => {
    await setupAuthenticatedApp(page, { role: 'Advanced' });
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.screenshot({ path: `${OUT}/home.png`, fullPage: true });
  });
});

test.describe('contratos dos primitivos — empréstimos', () => {
  test('detalhe: gráfico de saldo pelo primitivo e coluna de ações no mobile', async ({ page }) => {
    test.setTimeout(90000);
    await setupAuthenticatedApp(page, { role: 'Advanced' });
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto('/emprestimos', { waitUntil: 'domcontentloaded' });

    // O mock começa sem contratos: cria um, como faz a spec visual de empréstimos.
    await page.getByRole('button', { name: 'Novo contrato' }).click();
    await page.getByLabel('Título').fill('Financiamento imobiliário');
    await page.getByRole('button', { name: 'Simular', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Simulação' })).toBeVisible();
    await page.getByRole('button', { name: 'Criar contrato' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Financiamento imobiliário' })).toBeVisible();

    const detailHref = await page.getByRole('link', { name: 'Ver detalhes' }).first().getAttribute('href');
    expect(detailHref).toBeTruthy();
    await page.goto(detailHref!, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.getByRole('radio', { name: 'Evolução' }).click();
    const chart = page.locator('app-chart-line').first();
    await expect(chart).toBeVisible();
    await chart.screenshot({ path: `${OUT}/emprestimo-chart.png` });
    const pontos = await page.locator('app-chart-line .line__series').count();
    console.log('SERIES no grafico de saldo =', pontos);
    expect(pontos).toBeGreaterThan(0);

    // Mobile: a coluna de ações sobe para o topo do card, via variante do primitivo.
    await page.setViewportSize({ width: 390, height: 900 });
    await page.getByRole('radio', { name: 'Parcelas' }).click();
    const acoes = page.locator('.installments-list .responsive-list__item--actions').first();
    await expect(acoes).toBeVisible();
    const order = await acoes.evaluate((el) => getComputedStyle(el).order);
    const before = await acoes.evaluate((el) => getComputedStyle(el, '::before').content);
    console.log('ACOES order =', order, '| ::before =', before);
    expect(order).toBe('-1');
    expect(before).toBe('none');

    await page.locator('.installments-list .responsive-list__row').first()
      .screenshot({ path: `${OUT}/emprestimo-card-mobile.png` });
  });
});

test.describe('contratos dos primitivos — dashboard', () => {
  test('painel de insights: tons vêm de token, nos dois temas', async ({ page }) => {
    test.setTimeout(90000);
    await setupAuthenticatedApp(page, { role: 'Advanced' });
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Nenhuma classe utilitária de cor literal deve ter sobrado no DOM da home.
    const literais = await page.evaluate(() => {
      const re = /\b(bg|text|border|ring|from|to)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;
      return [...document.querySelectorAll('[class]')]
        .map((el) => el.getAttribute('class') || '')
        .filter((c) => re.test(c));
    });
    console.log('CLASSES DE COR LITERAL no DOM =', literais.length, literais.slice(0, 3));
    expect(literais).toEqual([]);

    await page.screenshot({ path: `${OUT}/home-claro.png`, fullPage: true });

    // Tema escuro: os tokens novos precisam existir nos dois temas.
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    const tokens = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return ['--income-border', '--warning-border', '--primary-border', '--neutral-tint', '--neutral-border']
        .map((t) => `${t}=${cs.getPropertyValue(t).trim()}`);
    });
    console.log('TOKENS no dark =', tokens.join(' | '));
    for (const t of tokens) expect(t.split('=')[1]).not.toBe('');
    await page.screenshot({ path: `${OUT}/home-escuro.png`, fullPage: true });
  });
});
