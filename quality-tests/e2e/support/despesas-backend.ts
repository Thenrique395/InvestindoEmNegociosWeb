import type { Page } from '@playwright/test';

/**
 * Backend em memória para os cenários de Despesas.
 *
 * O harness base (`authenticated-app`) devolve `plans` e `installments` vazios e
 * não persiste escrita nenhuma: sem isto, um teste de criar/pagar/excluir passa
 * sem exercitar o fluxo. Aqui as rotas respondem como as reais — inclusive nos
 * erros, que é onde a tela costuma escorregar.
 */

export const CATEGORIA_PADRAO = 'cat-default-expense-1';
export const CATEGORIA_ALTERNATIVA = 'cat-user-expense-1';
export const CARTAO_PADRAO = '33333333-3333-3333-3333-333333333333';

export interface Plano {
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
}

export interface Parcela {
  id: string;
  planId: string;
  installmentNo: number;
  dueDate: string;
  amount: number;
  status: string;
  statementYear?: number | null;
  statementMonth?: number | null;
}

export interface Pagamento {
  id: string;
  installmentId: string;
  paidAt: string;
  paidAmount: number;
  isReversal: boolean;
  canReverse: boolean;
  receiptUrl?: string | null;
}

/** Falha programada para o próximo verbo de escrita da rota indicada. */
export interface FalhaProgramada {
  rota: 'plans' | 'installments' | 'payments' | 'anticipations' | 'reversals' | 'receipt';
  status: number;
  detail: string;
}

export function mesCorrente(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}

/** `dd/MM/yyyy` de um dia do mês aberto — o formato que os campos usam. */
export function diaDoMes(dia: number): string {
  const hoje = new Date();
  return `${String(dia).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
}

export class BaseDespesas {
  readonly planos: Plano[] = [];
  readonly parcelas: Parcela[] = [];
  readonly pagamentos: Pagamento[] = [];

  falhaProgramada: FalhaProgramada | null = null;

  private seq = 0;

  private novoId(prefixo: string): string {
    this.seq += 1;
    return `${prefixo}-${this.seq}`;
  }

  /** Cria plano + parcelas de uma vez, do jeito que a listagem espera ver. */
  addPlano(dados: Partial<Plano> & { title: string; amount: number }, parcelas: Partial<Parcela>[] = [{}]): Plano {
    const mes = mesCorrente();
    const plano: Plano = {
      id: this.novoId('plan'),
      userId: 'u1',
      type: 'Expense',
      schedule: 'OneTime',
      categoryId: CATEGORIA_PADRAO,
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

  parcelaDe(titulo: string): Parcela | undefined {
    const plano = this.planos.find((p) => p.title === titulo);
    return this.parcelas.find((i) => i.planId === plano?.id);
  }

  private consomeFalha(rota: FalhaProgramada['rota']): FalhaProgramada | null {
    if (this.falhaProgramada?.rota !== rota) return null;
    const falha = this.falhaProgramada;
    this.falhaProgramada = null;
    return falha;
  }

  async instalar(page: Page): Promise<void> {
    // O harness base não serve este lookup, e sem ele o formulário fica sem
    // "Cartão de crédito" — a forma de pagamento que abre cartão e parcelas.
    await page.route('**/api/v1/lookups/payment-methods**', async (route) => {
      await route.fulfill({
        json: [
          { id: 1, name: 'Pix', isActive: true },
          { id: 2, name: 'Cartão de crédito', isActive: true },
          { id: 3, name: 'Cartão de débito', isActive: true },
          { id: 4, name: 'Dinheiro', isActive: true }
        ]
      });
    });

    await page.route('**/api/v1/plans**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const id = url.pathname.split('/').filter(Boolean).pop() || '';

      if (req.method() === 'GET') {
        const tipo = url.searchParams.get('type');
        await route.fulfill({ json: tipo ? this.planos.filter((p) => p.type === tipo) : this.planos });
        return;
      }

      const falha = this.consomeFalha('plans');
      if (falha) {
        await route.fulfill({ status: falha.status, json: { detail: falha.detail } });
        return;
      }

      if (req.method() === 'POST') {
        const payload = JSON.parse(req.postData() || '{}');
        const total = Math.max(1, Number(payload.installmentsCount || 1));
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
          Array.from({ length: total }, (_, i) => ({ dueDate: payload.startDate, installmentNo: i + 1 }))
        );
        await route.fulfill({ status: 201, json: criado });
        return;
      }

      if (req.method() === 'PUT') {
        const payload = JSON.parse(req.postData() || '{}');
        const plano = this.planos.find((p) => p.id === id);
        if (plano) {
          plano.title = payload.title ?? plano.title;
          plano.amount = Number(payload.amount ?? plano.amount);
          plano.categoryId = payload.categoryId ?? plano.categoryId;
          for (const parcela of this.parcelas.filter((i) => i.planId === plano.id)) {
            parcela.amount = plano.amount;
          }
        }
        await route.fulfill({ status: 204, body: '' });
        return;
      }

      if (req.method() === 'DELETE') {
        const indice = this.planos.findIndex((p) => p.id === id);
        if (indice >= 0) this.planos.splice(indice, 1);
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
      const ultimo = partes[partes.length - 1];

      if (req.method() === 'GET' && ultimo === 'installments') {
        const tipo = url.searchParams.get('type');
        const doTipo = new Set(this.planos.filter((p) => !tipo || p.type === tipo).map((p) => p.id));
        await route.fulfill({ json: this.parcelas.filter((i) => doTipo.has(i.planId)) });
        return;
      }

      if (req.method() === 'GET' && ultimo === 'payments') {
        const parcelaId = partes[partes.length - 2];
        await route.fulfill({ json: this.pagamentos.filter((p) => p.installmentId === parcelaId) });
        return;
      }

      if (req.method() === 'POST' && ultimo === 'payments') {
        const falha = this.consomeFalha('payments');
        if (falha) {
          await route.fulfill({ status: falha.status, json: { detail: falha.detail } });
          return;
        }
        const parcelaId = partes[partes.length - 2];
        const parcela = this.parcelas.find((p) => p.id === parcelaId);
        if (parcela) parcela.status = 'Paid';
        const pagamento: Pagamento = {
          id: this.novoId('pay'),
          installmentId: parcelaId,
          paidAt: new Date().toISOString(),
          paidAmount: parcela?.amount ?? 0,
          isReversal: false,
          canReverse: true
        };
        this.pagamentos.push(pagamento);
        await route.fulfill({ status: 201, json: pagamento });
        return;
      }

      if (req.method() === 'POST' && ultimo === 'anticipations') {
        const falha = this.consomeFalha('anticipations');
        if (falha) {
          await route.fulfill({ status: falha.status, json: { detail: falha.detail } });
          return;
        }
        const parcelaId = partes[partes.length - 2];
        const parcela = this.parcelas.find((p) => p.id === parcelaId);
        if (parcela) parcela.status = 'Anticipated';
        await route.fulfill({ status: 200, json: { id: parcelaId, status: 'Anticipated' } });
        return;
      }

      if (req.method() === 'POST' && ultimo === 'reversals') {
        const falha = this.consomeFalha('reversals');
        if (falha) {
          await route.fulfill({ status: falha.status, json: { detail: falha.detail } });
          return;
        }
        const parcelaId = partes[partes.length - 4];
        const parcela = this.parcelas.find((p) => p.id === parcelaId);
        if (parcela) parcela.status = 'Open';
        await route.fulfill({ status: 201, json: { id: this.novoId('rev'), isReversal: true } });
        return;
      }

      if (req.method() === 'POST' && ultimo === 'receipt') {
        const falha = this.consomeFalha('receipt');
        if (falha) {
          await route.fulfill({ status: falha.status, json: { detail: falha.detail } });
          return;
        }
        const pagamentoId = partes[partes.length - 2];
        const pagamento = this.pagamentos.find((p) => p.id === pagamentoId);
        if (pagamento) pagamento.receiptUrl = 'https://exemplo/comprovante.pdf';
        await route.fulfill({ status: 201, json: { receiptUrl: 'https://exemplo/comprovante.pdf' } });
        return;
      }

      if (req.method() === 'PUT') {
        const payload = JSON.parse(req.postData() || '{}');
        const parcela = this.parcelas.find((p) => p.id === ultimo);
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
        const falha = this.consomeFalha('installments');
        if (falha) {
          await route.fulfill({ status: falha.status, json: { detail: falha.detail } });
          return;
        }
        const indice = this.parcelas.findIndex((p) => p.id === ultimo);
        if (indice >= 0) this.parcelas.splice(indice, 1);
        await route.fulfill({ status: 204, body: '' });
        return;
      }

      await route.fulfill({ json: [] });
    });
  }
}
