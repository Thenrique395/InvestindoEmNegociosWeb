import { expect, test, type Page } from '@playwright/test';
import { setupAuthenticatedApp } from './support/authenticated-app';

/**
 * Fluxos da tela de Despesas, ponta a ponta.
 *
 * O harness base devolve `plans` e `installments` vazios e não persiste nada,
 * então esta spec traz o próprio estado em memória: criar, editar, pagar e
 * excluir precisam de um backend que responda como o real, senão o teste passa
 * sem exercitar o fluxo.
 */

type Plano = {
  id: string;
  userId: string;
  type: 'Expense' | 'Income';
  title: string;
  amount: number;
  schedule: string;
  categoryId: string | null;
  cardId: string | null;
  installmentsCount: number | null;
  startDate: string;
  status: string;
};

type Parcela = {
  id: string;
  planId: string;
  installmentNo: number;
  dueDate: string;
  amount: number;
  status: string;
};

const CATEGORIA = 'cat-default-expense-1';
const CARTAO = '33333333-3333-3333-3333-333333333333';

/** Uma data dentro do mês aberto na tela, no formato do campo. */
function vencimentoNoMes(): string {
  const hoje = new Date();
  return `10/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
}

function mesCorrente(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}

/** Backend em memória: o suficiente para Despesas exercitar CRUD de verdade. */
class BaseDespesas {
  readonly planos: Plano[] = [];
  readonly parcelas: Parcela[] = [];
  /** Quando definido, o próximo DELETE responde com este status. */
  falhaNoProximoDelete: { status: number; detail: string } | null = null;

  private seq = 0;

  private novoId(prefixo: string): string {
    this.seq += 1;
    return `${prefixo}-${this.seq}`;
  }

  addPlano(dados: Partial<Plano> & { title: string; amount: number }, parcelas: Partial<Parcela>[]): Plano {
    const mes = mesCorrente();
    const plano: Plano = {
      id: this.novoId('plan'),
      userId: 'u1',
      type: 'Expense',
      schedule: 'OneTime',
      categoryId: CATEGORIA,
      cardId: null,
      installmentsCount: 1,
      startDate: `${mes}-05`,
      status: 'Active',
      ...dados
    };
    this.planos.push(plano);
    parcelas.forEach((parcela, i) => {
      this.parcelas.push({
        id: this.novoId('inst'),
        planId: plano.id,
        installmentNo: i + 1,
        dueDate: `${mes}-05`,
        amount: plano.amount,
        status: 'Open',
        ...parcela
      });
    });
    return plano;
  }

  async instalar(page: Page): Promise<void> {
    await page.route('**/api/v1/plans**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const id = url.pathname.split('/').filter(Boolean).pop() || '';

      if (req.method() === 'GET') {
        const tipo = url.searchParams.get('type');
        const lista = tipo ? this.planos.filter((p) => p.type === tipo) : this.planos;
        await route.fulfill({ json: lista });
        return;
      }

      if (req.method() === 'POST') {
        const payload = JSON.parse(req.postData() || '{}');
        const total = Number(payload.installmentsCount || 1);
        const criado = this.addPlano(
          {
            title: payload.title,
            amount: Number(payload.amount || 0),
            schedule: payload.schedule,
            categoryId: payload.categoryId ?? null,
            cardId: payload.cardId ?? null,
            installmentsCount: payload.installmentsCount ?? null,
            startDate: payload.startDate
          },
          Array.from({ length: Math.max(1, total) }, (_, i) => ({
            dueDate: payload.startDate,
            installmentNo: i + 1
          }))
        );
        await route.fulfill({ status: 201, json: criado });
        return;
      }

      if (req.method() === 'DELETE') {
        if (this.falhaNoProximoDelete) {
          const falha = this.falhaNoProximoDelete;
          this.falhaNoProximoDelete = null;
          await route.fulfill({ status: falha.status, json: { detail: falha.detail } });
          return;
        }
        const i = this.planos.findIndex((p) => p.id === id);
        if (i >= 0) this.planos.splice(i, 1);
        for (let k = this.parcelas.length - 1; k >= 0; k -= 1) {
          if (this.parcelas[k].planId === id) this.parcelas.splice(k, 1);
        }
        await route.fulfill({ status: 204, body: '' });
        return;
      }

      await route.fulfill({ status: 204, body: '' });
    });

    await page.route('**/api/v1/installments**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const partes = url.pathname.split('/').filter(Boolean);
      const id = partes[partes.length - 1];

      if (req.method() === 'GET' && partes[partes.length - 1] === 'installments') {
        const tipo = url.searchParams.get('type');
        const doTipo = new Set(
          this.planos.filter((p) => !tipo || p.type === tipo).map((p) => p.id)
        );
        await route.fulfill({ json: this.parcelas.filter((i) => doTipo.has(i.planId)) });
        return;
      }

      if (req.method() === 'PUT') {
        const payload = JSON.parse(req.postData() || '{}');
        const parcela = this.parcelas.find((p) => p.id === id);
        if (parcela) {
          parcela.amount = Number(payload.amount ?? parcela.amount);
          parcela.dueDate = payload.dueDate ?? parcela.dueDate;
          const plano = this.planos.find((p) => p.id === parcela.planId);
          if (plano) plano.amount = parcela.amount;
        }
        await route.fulfill({ status: 204, body: '' });
        return;
      }

      if (req.method() === 'DELETE') {
        if (this.falhaNoProximoDelete) {
          const falha = this.falhaNoProximoDelete;
          this.falhaNoProximoDelete = null;
          await route.fulfill({ status: falha.status, json: { detail: falha.detail } });
          return;
        }
        const i = this.parcelas.findIndex((p) => p.id === id);
        if (i >= 0) this.parcelas.splice(i, 1);
        await route.fulfill({ status: 204, body: '' });
        return;
      }

      if (req.method() === 'POST' && partes[partes.length - 1] === 'payments') {
        const parcela = this.parcelas.find((p) => p.id === partes[partes.length - 2]);
        if (parcela) parcela.status = 'Paid';
        await route.fulfill({ status: 201, json: { id: 'pay-1' } });
        return;
      }

      await route.fulfill({ json: [] });
    });
  }
}

async function abrir(page: Page, base: BaseDespesas): Promise<void> {
  await setupAuthenticatedApp(page, { role: 'Advanced' });
  await base.instalar(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/despesas', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
}

const linha = (page: Page, nome: string) => page.locator('tbody tr').filter({ hasText: nome });

async function excluir(page: Page, nome: string): Promise<void> {
  await linha(page, nome).getByRole('button', { name: /excluir|remover/i }).first().click();
}

test.describe('Despesas — fluxos', () => {
  test('lista carrega com totais, filtros e contagem', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Aluguel', amount: 2400, schedule: 'Recurring', installmentsCount: null }, [{ status: 'Paid' }]);
    base.addPlano({ title: 'Farmácia', amount: 300 }, [{ status: 'Open' }]);
    await abrir(page, base);

    await expect(linha(page, 'Aluguel')).toBeVisible();
    await expect(linha(page, 'Farmácia')).toBeVisible();
    await expect(page.getByText('Mostrando 2 de 2 lançamentos')).toBeVisible();
    // O total do desktop mora no card do período; o mesmo número aparece no
    // bloco mobile, que fica oculto nesta largura.
    await expect(page.locator('app-period-total-card')).toContainText('R$ 2.700,00');
  });

  test('cria uma despesa pelo formulário e ela aparece na lista', async ({ page }) => {
    const base = new BaseDespesas();
    await abrir(page, base);

    await page.getByRole('button', { name: /Adicionar despesa/i }).first().click();
    const modal = page.getByRole('dialog');
    await modal.getByPlaceholder('Ex.: mercado, farmácia, aluguel').fill('Internet');
    await modal.getByPlaceholder('0,00').fill('219,90');
    await modal.getByRole('textbox', { name: 'Vencimento' }).fill(vencimentoNoMes());

    // Categoria é obrigatória: sem ela o botão de salvar fica desabilitado.
    await modal.getByRole('combobox', { name: 'Categoria da despesa' }).click();
    await page.getByRole('option', { name: 'Mercado', exact: true }).click();

    await modal.getByRole('button', { name: 'Salvar despesa' }).click();

    await expect(linha(page, 'Internet')).toBeVisible();
    expect(base.planos.some((p) => p.title === 'Internet')).toBe(true);
  });

  test('exclui despesa avulsa depois de confirmar', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Farmácia', amount: 300 }, [{}]);
    await abrir(page, base);

    await excluir(page, 'Farmácia');
    const dialogo = page.getByRole('dialog');
    await expect(dialogo.getByRole('heading', { name: 'Excluir lançamento?' })).toBeVisible();
    await dialogo.getByRole('button', { name: 'Excluir', exact: true }).click();

    await expect(linha(page, 'Farmácia')).toHaveCount(0);
    expect(base.parcelas.length).toBe(0);
  });

  test('exclui despesa de cartão — sem bloqueio no front', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Notebook', amount: 1000, cardId: CARTAO }, [{}]);
    await abrir(page, base);

    await excluir(page, 'Notebook');

    // O front bloqueava aqui com "Não é possível excluir uma despesa associada
    // a um cartão" — regra que a API nunca teve.
    await expect(page.getByText(/Não é possível excluir uma despesa associada/i)).toHaveCount(0);

    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();
    await dialogo.getByRole('button', { name: /^Excluir/ }).click();

    await expect(linha(page, 'Notebook')).toHaveCount(0);
    expect(base.parcelas.length).toBe(0);
  });

  test('parcelada de cartão: "todas as parcelas" apaga a série inteira', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano(
      { title: 'Notebook Dell', amount: 641.58, schedule: 'Installments', installmentsCount: 3, cardId: CARTAO },
      [{ installmentNo: 1 }, { installmentNo: 2 }, { installmentNo: 3 }]
    );
    await abrir(page, base);

    await excluir(page, 'Notebook Dell');
    const dialogo = page.getByRole('dialog');
    await expect(dialogo.getByRole('heading', { name: 'Excluir parcela ou série?' })).toBeVisible();
    await dialogo.getByRole('radio').nth(1).click();
    await dialogo.getByRole('button', { name: 'Excluir série' }).click();

    await expect(linha(page, 'Notebook Dell')).toHaveCount(0);
    expect(base.planos.length).toBe(0);
    expect(base.parcelas.length).toBe(0);
  });

  test('recorrente: "somente este mês" preserva o plano', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Plano de saúde', amount: 892, schedule: 'Recurring', installmentsCount: null }, [{}]);
    await abrir(page, base);

    await excluir(page, 'Plano de saúde');
    const dialogo = page.getByRole('dialog');
    await expect(dialogo.getByRole('heading', { name: 'Excluir este mês ou a recorrência?' })).toBeVisible();
    await dialogo.getByRole('button', { name: 'Excluir apenas esta' }).click();

    await expect(linha(page, 'Plano de saúde')).toHaveCount(0);
    // A recorrência continua: só a parcela do mês saiu.
    expect(base.planos.length).toBe(1);
    expect(base.parcelas.length).toBe(0);
  });

  test('erro da API mantém a despesa na lista e avisa', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Farmácia', amount: 300 }, [{}]);
    await abrir(page, base);

    base.falhaNoProximoDelete = { status: 400, detail: 'Parcela já conciliada.' };
    await excluir(page, 'Farmácia');
    await page.getByRole('dialog').getByRole('button', { name: 'Excluir', exact: true }).click();

    await expect(page.getByText(/Parcela já conciliada|Não foi possível excluir/i)).toBeVisible();
    await expect(linha(page, 'Farmácia')).toBeVisible();
  });

  test('filtro de status e busca por nome estreitam a lista', async ({ page }) => {
    const base = new BaseDespesas();
    base.addPlano({ title: 'Aluguel', amount: 2400 }, [{ status: 'Paid' }]);
    base.addPlano({ title: 'Farmácia', amount: 300 }, [{ status: 'Open' }]);
    await abrir(page, base);

    await page.getByPlaceholder('Nome da despesa').fill('Alug');
    await expect(linha(page, 'Aluguel')).toBeVisible();
    await expect(linha(page, 'Farmácia')).toHaveCount(0);

    await page.getByPlaceholder('Nome da despesa').fill('');
    await expect(linha(page, 'Farmácia')).toBeVisible();
  });
});
