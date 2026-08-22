import { test, expect } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

/**
 * Os cards de lista do dashboard têm altura FIXA (`--h-dashboard-card*`), e não
 * altura que segue o conteúdo. Este teste é o que garante isso: mede os mesmos
 * cards com carga normal e com dezenas de itens de nome longo, e exige o mesmo
 * número nos dois. Se alguém trocar a altura fixa por `min-height`, ou remover o
 * `min-height: 0` que permite a lista rolar por dentro, o card volta a crescer
 * e este teste quebra.
 */

/** Cards que existem em qualquer estado, inclusive sem dado nenhum. */
const SEMPRE_PRESENTES = [
  'app-spend-breakdown-card',
  'app-recent-activity-card',
  'app-attention-card',
  'app-upcoming-card'
];

/** Só aparecem quando há dado — comparados apenas entre carga normal e pesada. */
const CONDICIONAIS = ['app-recurrences-card', 'app-goals-card'];

const LONGO = 'Nome absurdamente longo que quebra em várias linhas seguidas';

async function alturas(page: import('@playwright/test').Page, seletores: string[]) {
  const out: Record<string, number> = {};
  for (const sel of seletores) {
    // `count()` antes de medir: card condicional ausente faria o `boundingBox`
    // esperar até o timeout em vez de devolver nulo.
    const alvo = page.locator(`${sel} > *`);
    out[sel] = (await alvo.count()) ? Math.round((await alvo.first().boundingBox())!.height) : -1;
  }
  return out;
}

async function semear(page: import('@playwright/test').Page, quantidade: number, nome: (i: number) => string) {
  await page.evaluate(
    ({ quantidade, usarLongo, LONGO }) => {
      const comp = (window as any).ng.getComponent(document.querySelector('app-home'));
      const rotulo = (i: number) => (usarLongo ? `${LONGO} ${i}` : `Item ${i}`);
      const hoje = new Date();
      const emDias = (n: number) => {
        const x = new Date(hoje);
        x.setDate(x.getDate() + n);
        return x;
      };
      const definir = (chave: string, valor: unknown) =>
        Object.defineProperty(comp, chave, { configurable: true, get: () => valor });

      definir(
        'spendSlices',
        Array.from({ length: quantidade }, (_, i) => ({
          label: rotulo(i),
          total: 5000 - i,
          percent: Math.max(5, 90 - i * 3),
          color: 'var(--chart-2)'
        }))
      );
      definir(
        'activityItems',
        Array.from({ length: quantidade }, (_, i) => ({
          id: `a${i}`,
          title: rotulo(i),
          dateLabel: '01 ago',
          context: usarLongo ? LONGO : 'Moradia',
          amount: 1000 + i,
          type: i % 2 ? 'income' : 'expense'
        }))
      );
      definir(
        'upcomingEntries',
        Array.from({ length: quantidade }, (_, i) => ({
          id: `u${i}`,
          name: rotulo(i),
          date: emDias(1),
          amount: 200 + i,
          kind: 'expense',
          context: usarLongo ? LONGO : 'Moradia'
        }))
      );
      definir(
        'recurrenceEntries',
        Array.from({ length: quantidade }, (_, i) => ({
          id: `r${i}`,
          title: rotulo(i),
          amount: 1000 + i,
          direction: 'expense',
          day: 5,
          category: usarLongo ? LONGO : 'Moradia',
          settled: false
        }))
      );
      definir(
        'goalEntries',
        Array.from({ length: quantidade }, (_, i) => ({
          id: `g${i}`,
          title: rotulo(i),
          target: 48000,
          current: 32000,
          targetDate: '2027-12-31',
          canceled: false
        }))
      );
      comp.pendenciasDetalhadas = {
        despesasEmAtraso: { quantidade, valor: 892, diasDoMaisAntigo: 3 },
        despesasProximas: { quantidade, valor: 2160 },
        receitasAtrasadas: { quantidade, valor: 1200 },
        faturasFechando: { quantidade: 0, valor: 0 }
      };
      (window as any).ng.applyChanges(comp);
    },
    { quantidade, usarLongo: nome(0).length > 20, LONGO }
  );
  await page.waitForTimeout(500);
}

test('altura dos cards não cresce com o volume de dados', async ({ page }) => {
  await setupAuthenticatedApp(page, { role: 'Advanced' });
  await page.setViewportSize({ width: 1440, height: 1600 });
  await page.goto('/dashboard');
  await page.locator('.dashboard-pair').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1000);

  const vazio = await alturas(page, SEMPRE_PRESENTES);
  console.log('VAZIO  ', JSON.stringify(vazio));

  const todos = [...SEMPRE_PRESENTES, ...CONDICIONAIS];
  await semear(page, 4, (i) => `Item ${i}`);
  const normal = await alturas(page, todos);
  console.log('NORMAL ', JSON.stringify(normal));

  await semear(page, 30, (i) => `${LONGO} ${i}`);
  const pesado = await alturas(page, todos);
  console.log('PESADO ', JSON.stringify(pesado));

  for (const sel of todos) {
    expect(normal[sel]).toBeGreaterThan(0);
    expect(pesado[sel]).toBe(normal[sel]);
  }
  // O card sem dado nenhum tem a mesma altura do card cheio — é o estado vazio
  // que ocupa a caixa, e não a caixa que encolhe até o estado vazio.
  for (const sel of SEMPRE_PRESENTES) {
    expect(vazio[sel]).toBe(normal[sel]);
  }
});
