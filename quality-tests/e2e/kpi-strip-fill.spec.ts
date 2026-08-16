import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

/**
 * README §4: "Toda faixa de indicadores é `display:flex; flex-wrap:wrap` com `flex:1 1 210px`
 * em cada card — nunca `grid` com `auto-fit`."
 *
 * O gate de fidelidade barra o `auto-fit` no SCSS, mas quem prova a regra é a régua: o
 * defeito que ela evita — célula vazia à direita quando a contagem de cards não divide pelo
 * número de colunas — só aparece em larguras específicas. Medido com grid, Contas deixava
 * 890px vazios a 1440px.
 */

const TELAS = [
  { rota: '/contas', cls: '.accounts-summary', nome: 'Contas' },
  { rota: '/calendario', cls: '.cal-summary', nome: 'Calendário' },
  { rota: '/categorias', cls: '.cat-summary', nome: 'Categorias' },
  { rota: '/snapshots', cls: '.snapshots-summary-grid', nome: 'Histórico mensal' },
  { rota: '/emprestimos', cls: '.loans-summary-grid', nome: 'Empréstimos' },
];

// Larguras onde a contagem de cards costuma deixar sobra ao quebrar.
const LARGURAS = [1440, 1280, 1100, 1024, 900, 760, 640, 480, 390];

// Tolerância de subpixel do layout.
const FOLGA_MAXIMA = 4;

for (const { rota, cls, nome } of TELAS) {
  test(`${nome}: a última linha da faixa preenche a largura`, async ({ page }) => {
    test.setTimeout(90000);
    await setupAuthenticatedApp(page, { role: 'Advanced' });

    for (const largura of LARGURAS) {
      await page.setViewportSize({ width: largura, height: 900 });
      await page.goto(rota, { waitUntil: 'domcontentloaded' });

      const faixa = page.locator(cls).first();
      await expect(faixa, `${nome} deveria ter faixa de indicadores`).toBeVisible({ timeout: 15000 });

      const cards = faixa.locator('> *');
      const total = await cards.count();
      if (!total) continue;

      const caixaFaixa = (await faixa.boundingBox())!;
      const caixas = [];
      for (let i = 0; i < total; i++) caixas.push((await cards.nth(i).boundingBox())!);

      // Cards com o mesmo topo estão na mesma linha; a última é a que pode sobrar.
      const ultimoTopo = Math.max(...caixas.map((c) => c.y));
      const ultimaLinha = caixas.filter((c) => Math.abs(c.y - ultimoTopo) < 4);
      const bordaDireita = Math.max(...ultimaLinha.map((c) => c.x + c.width));
      const folga = caixaFaixa.x + caixaFaixa.width - bordaDireita;

      expect(
        folga,
        `${nome} @${largura}px: última linha deixa ${folga.toFixed(0)}px vazios à direita`,
      ).toBeLessThan(FOLGA_MAXIMA);
    }
  });
}
