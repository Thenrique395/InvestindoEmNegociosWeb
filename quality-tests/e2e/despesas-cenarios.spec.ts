import { expect, test, type Page } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';
import {
  BaseDespesas,
  CARTAO_PADRAO,
  diaDoMes
} from './support/despesas-backend';

/**
 * Cenários da tela de Despesas, um a um.
 *
 * Complementa `despesas-fluxos.spec.ts` (o caminho feliz de cada operação) com
 * o resto do que a tela faz: período, ordenação, filtros, seleção em lote,
 * baixa, antecipação, histórico, permissões por perfil e os erros de API.
 */

const linha = (page: Page, nome: string) => page.locator('tbody tr').filter({ hasText: nome });

async function abrir(
  page: Page,
  base: BaseDespesas,
  opcoes: { role?: 'Basic' | 'Intermediate' | 'Advanced'; rota?: string } = {}
): Promise<void> {
  await setupAuthenticatedApp(page, { role: opcoes.role || 'Advanced' });
  await base.instalar(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(opcoes.rota || '/despesas', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
}

async function selecionar(page: Page, nome: string): Promise<void> {
  await linha(page, nome).getByRole('checkbox').check();
}

test.describe('Despesas — período e ordenação', () => {
  test('navega entre meses e o título acompanha', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Aluguel', amount: 2400 });
    await abrir(page, base);

    const titulo = page.getByRole('heading', { level: 2, name: /Despesas de/i });
    const mesInicial = (await titulo.textContent())?.trim();

    await page.getByRole('button', { name: /Próximo mês|próximo/i }).first().click();
    await page.waitForTimeout(600);
    await expect(titulo).not.toHaveText(mesInicial || '');
    // O lançamento é do mês corrente: no mês seguinte a lista não o mostra.
    await expect(linha(page, 'Aluguel')).toHaveCount(0);

    await page.getByRole('button', { name: /Mês anterior|anterior/i }).first().click();
    await page.waitForTimeout(600);
    await expect(titulo).toHaveText(mesInicial || '');
    await expect(linha(page, 'Aluguel')).toBeVisible();
  });

  test('ordena pela coluna de valor', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Barato', amount: 50 });
    base.addPlano({ title: 'Caro', amount: 5000 });
    await abrir(page, base);

    const nomes = async () =>
      (await page.locator('tbody tr td:nth-child(2)').allTextContents()).map((t) => t.trim().split('\n')[0]);

    await page.getByRole('button', { name: /^Valor/ }).click();
    await page.waitForTimeout(400);
    const asc = await nomes();

    await page.getByRole('button', { name: /^Valor/ }).click();
    await page.waitForTimeout(400);
    const desc = await nomes();

    expect(asc).not.toEqual(desc);
    expect(asc.slice().reverse()).toEqual(desc);
  });

  test('sem lançamentos, mostra o estado vazio com a ação de criar', async ({ page }) => {
    await abrir(page, new BaseDespesas());

    await expect(page.getByText('Sem despesas no período')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Adicionar despesa' }).last()).toBeVisible();
  });

  test('os indicadores somam por situação', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Pendente', amount: 100 }, [{ status: 'Open' }]);
    base.addPlano({ title: 'Paga', amount: 200 }, [{ status: 'Paid' }]);
    base.addPlano({ title: 'Antecipada', amount: 300 }, [{ status: 'Anticipated' }]);
    await abrir(page, base);

    // Filtrar por texto pega os três cards: o tooltip de cada um cita os outros.
    const card = (rotulo: string) => page.locator(`app-transaction-summary-card[eyebrow="${rotulo}"]`);

    await expect(card('Pendentes')).toContainText('R$ 100,00');
    await expect(card('Pagas')).toContainText('R$ 200,00');
    await expect(card('Antecipadas')).toContainText('R$ 300,00');
    await expect(page.locator('app-period-total-card')).toContainText('R$ 600,00');
  });
});

test.describe('Despesas — filtros', () => {
  test('filtra por status e a contagem do dropdown bate', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Em aberto A', amount: 100 }, [{ status: 'Open', dueDate: `${diaDoMes(28).split('/').reverse().join('-')}` }]);
    base.addPlano({ title: 'Já paga', amount: 200 }, [{ status: 'Paid' }]);
    await abrir(page, base);

    await page.getByRole('combobox', { name: 'Filtrar por status' }).click();
    await page.getByRole('listbox').getByRole('option', { name: /^Paga/ }).first().click();
    await page.waitForTimeout(400);

    await expect(linha(page, 'Já paga')).toBeVisible();
    await expect(linha(page, 'Em aberto A')).toHaveCount(0);
  });

  test('filtra por categoria e "Limpar filtros" devolve a lista inteira', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Do mercado', amount: 100, categoryId: 'cat-default-expense-1' });
    base.addPlano({ title: 'Dos lanches', amount: 200, categoryId: 'cat-user-expense-1' });
    await abrir(page, base);

    await page.getByRole('combobox', { name: 'Filtrar por categoria' }).click();
    await page.getByRole('listbox').getByRole('option', { name: 'Lanches' }).click();
    await page.waitForTimeout(400);

    await expect(linha(page, 'Dos lanches')).toBeVisible();
    await expect(linha(page, 'Do mercado')).toHaveCount(0);

    await page.getByRole('button', { name: 'Limpar filtros' }).click();
    await page.waitForTimeout(400);
    await expect(linha(page, 'Do mercado')).toBeVisible();
    await expect(linha(page, 'Dos lanches')).toBeVisible();
  });

  test('a busca global pré-filtra a lista pela query string', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Farmácia', amount: 100 });
    base.addPlano({ title: 'Aluguel', amount: 200 });
    await abrir(page, base, { rota: '/despesas?q=Farm' });

    await expect(linha(page, 'Farmácia')).toBeVisible();
    await expect(linha(page, 'Aluguel')).toHaveCount(0);
  });

  test('?novo=1 abre o formulário direto', async ({ page }) => {
    await abrir(page, new BaseDespesas(), { rota: '/despesas?novo=1' });
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Registrar uma saída/i })).toBeVisible();
  });
});

test.describe('Despesas — formulário', () => {
  test('recusa salvar sem nome, sem valor e sem categoria', async ({ page }) => {
    await abrir(page, new BaseDespesas());
    await page.getByRole('button', { name: 'Adicionar despesa' }).first().click();
    const modal = page.getByRole('dialog');

    // Sem categoria o botão nasce desabilitado: é a validação mais forte da tela.
    await expect(modal.getByRole('button', { name: 'Salvar despesa' })).toBeDisabled();

    await modal.getByPlaceholder('Ex.: mercado, farmácia, aluguel').fill('Só o nome');
    await expect(modal.getByRole('button', { name: 'Salvar despesa' })).toBeDisabled();
  });

  test('parcelada gera uma parcela por mês contratado', async ({ page }) => {
    const base = new BaseDespesas();
    await abrir(page, base);

    await page.getByRole('button', { name: 'Adicionar despesa' }).first().click();
    const modal = page.getByRole('dialog');
    await modal.getByPlaceholder('Ex.: mercado, farmácia, aluguel').fill('Notebook');
    await modal.getByPlaceholder('0,00').fill('900,00');
    await modal.getByRole('textbox', { name: 'Vencimento' }).fill(diaDoMes(10));
    await modal.getByRole('combobox', { name: 'Categoria da despesa' }).click();
    await page.getByRole('listbox').getByRole('option').first().click();

    await modal.getByRole('combobox', { name: 'Forma de pagamento' }).click();
    await page.getByRole('listbox').getByRole('option', { name: /cartão de crédito/i }).click();
    await modal.getByRole('combobox', { name: 'Cartão do lançamento' }).click();
    await page.getByRole('listbox').getByRole('option').first().click();

    await modal.locator('.toggle-field__switch').first().click();
    await modal.getByRole('spinbutton', { name: 'Número de parcelas' }).fill('3');
    await modal.getByRole('button', { name: 'Salvar despesa' }).click();
    await page.waitForTimeout(1200);

    expect(base.planos.find((p) => p.title === 'Notebook')?.installmentsCount).toBe(3);
    expect(base.parcelas.filter((i) => i.planId === base.planos.find((p) => p.title === 'Notebook')?.id)).toHaveLength(3);
  });

  test('erro da API ao salvar mantém o formulário aberto', async ({ page }) => {
    const base = new BaseDespesas();
    await abrir(page, base);
    base.falhaProgramada = { rota: 'plans', status: 400, detail: 'Categoria inativa.' };

    await page.getByRole('button', { name: 'Adicionar despesa' }).first().click();
    const modal = page.getByRole('dialog');
    await modal.getByPlaceholder('Ex.: mercado, farmácia, aluguel').fill('Vai falhar');
    await modal.getByPlaceholder('0,00').fill('10,00');
    await modal.getByRole('textbox', { name: 'Vencimento' }).fill(diaDoMes(10));
    await modal.getByRole('combobox', { name: 'Categoria da despesa' }).click();
    await page.getByRole('listbox').getByRole('option').first().click();
    await modal.getByRole('button', { name: 'Salvar despesa' }).click();
    await page.waitForTimeout(1200);

    await expect(page.getByText(/Categoria inativa|Não foi possível salvar/i)).toBeVisible();
    await expect(modal).toBeVisible();
  });
});

test.describe('Despesas — seleção e ações em lote', () => {
  test('selecionar todas marca a lista inteira e a barra some ao limpar', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Uma', amount: 10 });
    base.addPlano({ title: 'Outra', amount: 20 });
    await abrir(page, base);

    await page.getByRole('checkbox', { name: 'Selecionar todas' }).check();
    await expect(page.getByText(/2 selecionada\(s\)/)).toBeVisible();

    await page.getByRole('checkbox', { name: 'Selecionar todas' }).uncheck();
    await expect(page.getByText(/selecionada\(s\)/)).toHaveCount(0);
  });

  test('marca como paga em lote e o status muda na lista', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Conta de luz', amount: 120 });
    await abrir(page, base, { role: 'Basic' });

    await selecionar(page, 'Conta de luz');
    await page.getByRole('button', { name: 'Marcar como pago' }).click();
    await page.waitForTimeout(1500);

    expect(base.parcelaDe('Conta de luz')?.status).toBe('Paid');
    await expect(linha(page, 'Conta de luz')).toContainText(/Paga/i);
  });

  test('erro da API na baixa avisa e mantém a despesa em aberto', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Conta de água', amount: 90 });
    await abrir(page, base, { role: 'Basic' });

    base.falhaProgramada = { rota: 'payments', status: 400, detail: 'Conta obrigatória.' };
    await selecionar(page, 'Conta de água');
    await page.getByRole('button', { name: 'Marcar como pago' }).click();
    await page.waitForTimeout(1500);

    // A tela mostra uma mensagem própria e não repassa o detalhe da API
    // ("Conta obrigatória") — ver nota no relatório de cobertura.
    await expect(page.locator('.global-alert')).toContainText(/Falha ao marcar pagamentos/i);
    expect(base.parcelaDe('Conta de água')?.status).toBe('Open');
  });

  test('excluir em lote pede confirmação e remove as selecionadas', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Descartável', amount: 30 });
    await abrir(page, base);

    await selecionar(page, 'Descartável');
    await page.getByRole('button', { name: 'Excluir', exact: true }).first().click();

    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();
    await dialogo.getByRole('button', { name: /^Excluir/ }).click();
    await page.waitForTimeout(1500);

    await expect(linha(page, 'Descartável')).toHaveCount(0);
  });

  test('lote com série ou recorrência orienta a excluir uma por vez', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Avulsa', amount: 30 });
    base.addPlano(
      { title: 'Parcelada', amount: 60, schedule: 'Installments', installmentsCount: 3 },
      [{ installmentNo: 1 }, { installmentNo: 2 }, { installmentNo: 3 }]
    );
    await abrir(page, base);

    await page.getByRole('checkbox', { name: 'Selecionar todas' }).check();
    await page.getByRole('button', { name: 'Excluir', exact: true }).first().click();

    // Espera o alerta em vez de amostrar depois de um sleep: ele dura 3,5s e a
    // amostragem fixa dava flake quando a máquina estava carregada.
    await expect(page.locator('.global-alert')).toContainText(/exclua uma por vez/i, { timeout: 10000 });
    await expect(linha(page, 'Avulsa')).toBeVisible();
  });
});

test.describe('Despesas — permissões por perfil', () => {
  test('Basic não vê antecipação, conta de baixa nem importar fatura', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Qualquer', amount: 30 });
    await abrir(page, base, { role: 'Basic' });

    await expect(page.getByRole('button', { name: /Importar fatura/i })).toHaveCount(0);

    await selecionar(page, 'Qualquer');
    await expect(page.getByRole('button', { name: 'Marcar como pago' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Solicitar antecipação/i })).toHaveCount(0);
    await expect(page.getByText('Conta de baixa')).toHaveCount(0);
  });

  test('Intermediate ganha antecipação, conta de baixa e importação', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Qualquer', amount: 30 });
    await abrir(page, base, { role: 'Intermediate' });

    await expect(page.getByRole('button', { name: /Importar fatura/i })).toBeVisible();

    await selecionar(page, 'Qualquer');
    await expect(page.getByRole('button', { name: /Solicitar antecipação/i })).toBeVisible();
    await expect(page.getByText('Conta de baixa')).toBeVisible();
  });

  test('antecipação só aceita vencimento em mês futuro', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Deste mês', amount: 30 });
    await abrir(page, base, { role: 'Intermediate' });

    await selecionar(page, 'Deste mês');
    await page.getByRole('button', { name: /Solicitar antecipação/i }).click();
    await page.waitForTimeout(1000);

    await expect(page.locator('.global-alert')).toContainText(/não é possível antecipar despesas do mês atual/i);
    expect(base.parcelaDe('Deste mês')?.status).toBe('Open');
  });
});

test.describe('Despesas — histórico da série', () => {
  test('abre o histórico e separa parcelas pagas das pendentes', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano(
      { title: 'Notebook Dell', amount: 300, schedule: 'Installments', installmentsCount: 3 },
      [
        { installmentNo: 1, status: 'Paid' },
        { installmentNo: 2, status: 'Open' },
        { installmentNo: 3, status: 'Open' }
      ]
    );
    await abrir(page, base);

    await linha(page, 'Notebook Dell').first().getByRole('button', { name: 'Histórico' }).click();
    await page.waitForTimeout(800);

    const gaveta = page.locator('.expenses-history-drawer');
    await expect(gaveta).toBeVisible();
    await expect(gaveta.getByRole('heading', { name: 'Pagas' })).toBeVisible();
    await expect(gaveta.getByRole('heading', { name: /Pendentes/ })).toBeVisible();

    await gaveta.getByRole('button', { name: 'Fechar histórico' }).click();
    await expect(gaveta).toHaveCount(0);
  });

  test('estorna o pagamento e a parcela volta para em aberto', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Assinatura', amount: 120 });
    await abrir(page, base, { role: 'Basic' });

    // Paga primeiro: o estorno precisa de um pagamento com `canReverse`.
    await selecionar(page, 'Assinatura');
    await page.getByRole('button', { name: 'Marcar como pago' }).click();
    await page.waitForTimeout(1500);
    expect(base.parcelaDe('Assinatura')?.status).toBe('Paid');

    await linha(page, 'Assinatura').first().getByRole('button', { name: 'Histórico' }).click();
    const gaveta = page.locator('.expenses-history-drawer');
    await expect(gaveta).toBeVisible();

    await gaveta.getByRole('button', { name: 'Estornar pagamento' }).first().click();
    await page.waitForTimeout(2000);

    expect(base.parcelaDe('Assinatura')?.status).toBe('Open');
  });

  test('recusa estornar parcela que não está paga', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano(
      { title: 'Curso', amount: 200, schedule: 'Installments', installmentsCount: 2 },
      [{ installmentNo: 1, status: 'Paid' }, { installmentNo: 2, status: 'Open' }]
    );
    await abrir(page, base);

    await linha(page, 'Curso').first().getByRole('button', { name: 'Histórico' }).click();
    const gaveta = page.locator('.expenses-history-drawer');
    await expect(gaveta).toBeVisible();

    // A parcela em aberto aparece na coluna de pendentes, sem ação de estorno.
    const pendentes = gaveta.locator('.expenses-history-group').filter({ hasText: 'Pendentes' });
    await expect(pendentes.getByRole('button', { name: 'Estornar pagamento' })).toHaveCount(0);
  });
});
