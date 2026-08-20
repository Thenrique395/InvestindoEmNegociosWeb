import { test, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { setupAuthenticatedApp } from './support/authenticated-app';

/**
 * QA visual do desktop — captura pareada app real × protótipo do handoff.
 *
 * Não afirma nada sozinho: produz os pares de imagem que a revisão compara.
 * O gate de fidelidade lê o código, a spec de login mede números; este passo
 * é o olho humano sobre a tela inteira, que é onde aparecem hierarquia,
 * densidade e ordem — coisas que nenhuma das duas verificações enxerga.
 */
const LARGURA = 1440;
const ALTURA = 1000;

const SAIDA = join(process.cwd(), '..', 'investindoEmNegociosWeb', 'docs', 'ai-reports', 'qa-desktop');
const PROTOTIPOS = join(process.cwd(), '..', 'design_handoff_investindo_redesign', 'prototipos');

/** Tela do app e o protótipo correspondente. */
const TELAS: ReadonlyArray<{ nome: string; rota: string; prototipo: string }> = [
  { nome: 'dashboard', rota: '/dashboard', prototipo: 'Dashboard.dc.html' },
  { nome: 'despesas', rota: '/despesas', prototipo: 'Despesas-e-Receitas.dc.html' },
  { nome: 'receitas', rota: '/receitas', prototipo: 'Despesas-e-Receitas.dc.html' },
  { nome: 'cartoes', rota: '/cartoes', prototipo: 'Cartoes.dc.html' },
  { nome: 'contas', rota: '/contas', prototipo: 'Contas.dc.html' },
  { nome: 'calendario', rota: '/calendario', prototipo: 'Calendario.dc.html' },
  { nome: 'metas', rota: '/metas', prototipo: 'Metas.dc.html' },
  { nome: 'orcamento', rota: '/orcamento', prototipo: 'Orcamento.dc.html' },
  { nome: 'investimentos', rota: '/investimentos', prototipo: 'Investimentos.dc.html' }
];

/**
 * O protótipo revela as seções ao rolar: sem chegar ao fim antes da captura, a
 * página sai em branco. Rola até o fim, espera a animação e volta ao topo.
 */
async function revelar(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const passo = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += passo) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
}

/**
 * Lançamentos do próprio protótipo, para as duas listagens.
 *
 * O harness devolve listas vazias em plans/installments, e o estado vazio não
 * se compara com um protótipo cheio: sem isto o QA olharia dois desenhos
 * diferentes e concluiria qualquer coisa.
 */
function seedLancamentos(page: Page): Promise<void> {
  const hoje = new Date();
  const mes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const cat = 'cat-default-expense-1';
  const catIncome = 'cat-default-income-1';

  const plans = [
    { id: 'p1', userId: 'u1', type: 'Expense', title: 'Plano de saúde', amount: 892, schedule: 'Recurring', categoryId: cat, startDate: `${mes}-01`, status: 'Active', installmentsCount: null },
    { id: 'p2', userId: 'u1', type: 'Expense', title: 'Combustível', amount: 412.8, schedule: 'OneTime', categoryId: cat, startDate: `${mes}-03`, status: 'Active', installmentsCount: 1 },
    { id: 'p3', userId: 'u1', type: 'Expense', title: 'Aluguel', amount: 2400, schedule: 'Recurring', categoryId: cat, startDate: `${mes}-05`, status: 'Active', installmentsCount: null },
    { id: 'p4', userId: 'u1', type: 'Expense', title: 'Energia elétrica', amount: 318.42, schedule: 'OneTime', categoryId: cat, startDate: `${mes}-10`, status: 'Active', installmentsCount: 1 },
    { id: 'p5', userId: 'u1', type: 'Expense', title: 'Notebook Dell', amount: 641.58, schedule: 'Installments', categoryId: cat, startDate: `${mes}-12`, status: 'Active', installmentsCount: 12 },
    { id: 'p6', userId: 'u1', type: 'Expense', title: 'Internet e telefone', amount: 219.9, schedule: 'Recurring', categoryId: cat, startDate: `${mes}-15`, status: 'Active', installmentsCount: null },
    { id: 'r1', userId: 'u1', type: 'Income', title: 'Salário', amount: 8200, schedule: 'Recurring', categoryId: catIncome, startDate: `${mes}-05`, status: 'Active', installmentsCount: null },
    { id: 'r2', userId: 'u1', type: 'Income', title: 'Consultoria', amount: 1850, schedule: 'OneTime', categoryId: catIncome, startDate: `${mes}-12`, status: 'Active', installmentsCount: 1 },
    { id: 'r3', userId: 'u1', type: 'Income', title: 'Dividendos', amount: 320.4, schedule: 'OneTime', categoryId: catIncome, startDate: `${mes}-18`, status: 'Active', installmentsCount: 1 }
  ];

  const installments = [
    { id: 'i1', planId: 'p1', installmentNo: 1, dueDate: `${mes}-01`, amount: 892, status: 'Open' },
    { id: 'i2', planId: 'p2', installmentNo: 1, dueDate: `${mes}-03`, amount: 412.8, status: 'Paid' },
    { id: 'i3', planId: 'p3', installmentNo: 1, dueDate: `${mes}-05`, amount: 2400, status: 'Paid' },
    { id: 'i4', planId: 'p4', installmentNo: 1, dueDate: `${mes}-10`, amount: 318.42, status: 'Open' },
    { id: 'i5', planId: 'p5', installmentNo: 4, dueDate: `${mes}-12`, amount: 641.58, status: 'Open' },
    { id: 'i6', planId: 'p6', installmentNo: 1, dueDate: `${mes}-15`, amount: 219.9, status: 'Anticipated' },
    { id: 'j1', planId: 'r1', installmentNo: 1, dueDate: `${mes}-05`, amount: 8200, status: 'Paid' },
    { id: 'j2', planId: 'r2', installmentNo: 1, dueDate: `${mes}-12`, amount: 1850, status: 'Open' },
    { id: 'j3', planId: 'r3', installmentNo: 1, dueDate: `${mes}-18`, amount: 320.4, status: 'Paid' }
  ];

  const porTipo = <T extends { type?: string; planId?: string }>(lista: T[], url: string, tipoDe: (item: T) => string) => {
    const tipo = new URL(url).searchParams.get('type');
    return tipo ? lista.filter((item) => tipoDe(item) === tipo) : lista;
  };

  const tipoDoPlano = new Map(plans.map((plan) => [plan.id, plan.type]));

  return Promise.all([
    page.route('**/api/v1/plans**', (route) =>
      route.fulfill({ json: porTipo(plans, route.request().url(), (plan) => plan.type!) })
    ),
    page.route('**/api/v1/installments**', (route) =>
      route.fulfill({
        json: porTipo(installments, route.request().url(), (inst) => tipoDoPlano.get(inst.planId!) || '')
      })
    )
  ]).then(() => undefined);
}

test.describe('QA visual do desktop', () => {
  test.beforeEach(() => {
    mkdirSync(SAIDA, { recursive: true });
  });

  test('captura os protótipos do handoff em 1440px', async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: LARGURA, height: ALTURA });

    const vistos = new Set<string>();
    for (const tela of TELAS) {
      if (vistos.has(tela.prototipo)) continue;
      vistos.add(tela.prototipo);

      await page.goto(pathToFileURL(join(PROTOTIPOS, tela.prototipo)).href, { waitUntil: 'networkidle' });
      await revelar(page);
      await page.screenshot({
        path: join(SAIDA, `proto-${tela.prototipo.replace('.dc.html', '')}.png`),
        fullPage: true
      });
    }
  });

  test('captura as telas do app em 1440px', async ({ page }) => {
    test.setTimeout(180000);
    await setupAuthenticatedApp(page, { role: 'Advanced' });
    await seedLancamentos(page);
    await page.setViewportSize({ width: LARGURA, height: ALTURA });

    for (const tela of TELAS) {
      await page.goto(tela.rota, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: join(SAIDA, `app-${tela.nome}.png`), fullPage: true });
    }
  });
});
