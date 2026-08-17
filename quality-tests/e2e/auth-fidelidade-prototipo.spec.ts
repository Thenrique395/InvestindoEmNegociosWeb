import { expect, test, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

/**
 * Mede a tela de login contra o protótipo do handoff, no próprio navegador.
 *
 * O gate de fidelidade lê o código; este teste lê o resultado. É o que separa
 * "parecido" de "igual": tamanho de fonte, largura de conteúdo e altura de
 * controle são comparados número a número com o arquivo do designer, e não
 * com a memória de quem implementou.
 *
 * A viewport é 1160 porque a página de protótipo tem `padding: 44px 40px 64px`,
 * então o card dela mede exatamente os 1080px de design nessa largura. É a
 * única largura em que os dois são comparáveis célula a célula: acima disso a
 * tela do app ocupa a viewport inteira, por decisão de produto, enquanto o
 * protótipo continua sendo um card de largura fixa.
 */
const PROTOTIPO = pathToFileURL(
  join(process.cwd(), '..', 'design_handoff_investindo_redesign', 'prototipos', 'Autenticacao.dc.html'),
).href;

const LARGURA = 1160;
const ALTURA = 780;

/** Diferença tolerada, em px. Arredondamento de subpixel, não licença. */
const TOLERANCIA = 2;

interface Medida {
  w: number;
  h: number;
  fs: string;
}

async function medir(page: Page): Promise<Record<string, Medida | null>> {
  return page.evaluate(() => {
    const acha = (texto: string) =>
      [...document.querySelectorAll('*')].find(
        (el) => (el.textContent || '').trim().startsWith(texto) && el.children.length <= 1,
      );
    const geo = (el: Element | null | undefined) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), fs: getComputedStyle(el).fontSize };
    };
    return {
      titulo: geo(acha('Acesse sua conta')),
      descricao: geo(acha('Use seu e-mail')),
      asideTitulo: geo(acha('Controle seu dinheiro')),
      asideTexto: geo(acha('Uma visão objetiva')),
      campo: geo(document.querySelector('input')),
      botao: geo(
        [...document.querySelectorAll('button')].find((b) => /Entrar no dashboard/.test(b.textContent || '')),
      ),
    };
  });
}

test('a tela de login reproduz as medidas do protótipo', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: LARGURA, height: ALTURA });

  await page.goto(PROTOTIPO, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const proto = await medir(page);

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  const app = await medir(page);

  for (const chave of Object.keys(proto)) {
    const p = proto[chave];
    const a = app[chave];
    expect(p, `o protótipo não expôs ${chave} — o seletor do teste envelheceu`).not.toBeNull();
    expect(a, `o app não expôs ${chave}`).not.toBeNull();

    expect(
      Math.abs(a!.w - p!.w),
      `${chave}: largura ${a!.w}px contra ${p!.w}px do protótipo`,
    ).toBeLessThanOrEqual(TOLERANCIA);

    expect(
      Math.abs(a!.h - p!.h),
      `${chave}: altura ${a!.h}px contra ${p!.h}px do protótipo`,
    ).toBeLessThanOrEqual(TOLERANCIA);

    expect(a!.fs, `${chave}: fonte ${a!.fs} contra ${p!.fs} do protótipo`).toBe(p!.fs);
  }
});
