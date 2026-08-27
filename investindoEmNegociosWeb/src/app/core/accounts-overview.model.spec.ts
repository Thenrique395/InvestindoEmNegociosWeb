import { AccountResponse, AccountTransactionResponse } from './accounts.service';
import {
  accountTypeLabel,
  buildAccountActivity,
  buildAccountsOverview,
  buildActivityMap,
  distributionFor,
  filterAccounts,
  periodRange,
  sortAccounts
} from './accounts-overview.model';

function account(p: Partial<AccountResponse> & { id: string }): AccountResponse {
  return {
    name: 'Conta',
    type: 'Checking',
    initialBalance: 0,
    currentBalance: 100,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    currency: 'BRL',
    ...p
  };
}

function tx(p: Partial<AccountTransactionResponse> & { id: string }): AccountTransactionResponse {
  return {
    accountId: 'a1',
    occurredAt: '2026-07-05T10:00:00Z',
    type: 'Income',
    kind: 'Credit',
    amount: 100,
    description: 'Mov',
    createdAt: '2026-07-05T10:00:00Z',
    ...p
  };
}

describe('accounts-overview.model', () => {
  describe('buildAccountActivity', () => {
    it('separa entradas, saídas e transferências (transfer não é receita/despesa)', () => {
      const activity = buildAccountActivity('a1', [
        tx({ id: 't1', type: 'Income', kind: 'Credit', amount: 500 }),
        tx({ id: 't2', type: 'Expense', kind: 'Debit', amount: 200 }),
        tx({ id: 't3', type: 'Transfer', kind: 'Credit', amount: 300 }),
        tx({ id: 't4', type: 'Transfer', kind: 'Debit', amount: 150 })
      ]);
      expect(activity.income).toBe(500);
      expect(activity.expense).toBe(200);
      expect(activity.transferIn).toBe(300);
      expect(activity.transferOut).toBe(150);
      expect(activity.net).toBe(300);
      expect(activity.movementCount).toBe(4);
    });

    it('captura a última movimentação', () => {
      const activity = buildAccountActivity('a1', [
        tx({ id: 't1', occurredAt: '2026-07-01T10:00:00Z' }),
        tx({ id: 't2', occurredAt: '2026-07-09T10:00:00Z' }),
        tx({ id: 't3', occurredAt: '2026-07-05T10:00:00Z' })
      ]);
      expect(activity.lastMovementAt).toBe('2026-07-09T10:00:00Z');
    });

    it('classifica pela direção do dinheiro (estorno Expense+Credit conta como entrada)', () => {
      const activity = buildAccountActivity('a1', [
        tx({ id: 't1', type: 'Expense', kind: 'Credit', amount: 80 })
      ]);
      expect(activity.income).toBe(80);
      expect(activity.expense).toBe(0);
    });

    it('conta vazia gera atividade zerada', () => {
      const activity = buildAccountActivity('a1', []);
      expect(activity.movementCount).toBe(0);
      expect(activity.lastMovementAt).toBeNull();
    });
  });

  describe('buildAccountsOverview', () => {
    it('agrega saldo total, ativas e entradas/saídas (só ativas)', () => {
      const accounts = [
        account({ id: 'a1', currentBalance: 1000, isActive: true }),
        account({ id: 'a2', currentBalance: 500, isActive: true }),
        account({ id: 'a3', currentBalance: 999, isActive: false })
      ];
      const map = buildActivityMap({
        a1: [tx({ id: 't1', type: 'Income', amount: 300 }), tx({ id: 't2', type: 'Expense', kind: 'Debit', amount: 100 })],
        a2: [tx({ id: 't3', type: 'Income', amount: 200 })]
      });
      const overview = buildAccountsOverview(accounts, map, 'a1');
      expect(overview.totalBalance).toBe(1500); // ignora inativa
      expect(overview.activeCount).toBe(2);
      expect(overview.totalCount).toBe(3);
      expect(overview.totalIncome).toBe(500);
      expect(overview.totalExpense).toBe(100);
      expect(overview.primaryAccountId).toBe('a1');
      expect(overview.hasNegative).toBeFalse();
    });

    it('detecta saldo negativo', () => {
      const overview = buildAccountsOverview([account({ id: 'a1', currentBalance: -50 })], {}, null);
      expect(overview.hasNegative).toBeTrue();
    });
  });

  describe('distributionFor', () => {
    it('gera percentuais por conta ativa positiva', () => {
      const dist = distributionFor([
        account({ id: 'a1', currentBalance: 750 }),
        account({ id: 'a2', currentBalance: 250 }),
        account({ id: 'a3', currentBalance: -10 }),
        account({ id: 'a4', currentBalance: 100, isActive: false })
      ]);
      expect(dist.length).toBe(2);
      expect(dist[0].label).toBe('Conta'); // maior saldo primeiro
      expect(dist[0].percent).toBe(75);
      expect(dist[1].percent).toBe(25);
    });

    it('vazio quando não há saldo positivo', () => {
      expect(distributionFor([account({ id: 'a1', currentBalance: 0 })]).length).toBe(0);
    });
  });

  describe('filterAccounts / sortAccounts', () => {
    const accounts = [
      account({ id: 'a1', name: 'Nubank', currentBalance: 300, type: 'DigitalWallet' }),
      account({ id: 'a2', name: 'Itaú', currentBalance: -20, type: 'Checking' }),
      account({ id: 'a3', name: 'Carteira', currentBalance: 50, type: 'Cash', isActive: false })
    ];

    it('filtra por busca, tipo, status e saldo', () => {
      expect(filterAccounts(accounts, { search: 'nu', type: 'all', status: 'all', balance: 'all' }).length).toBe(1);
      expect(filterAccounts(accounts, { search: '', type: 'Checking', status: 'all', balance: 'all' }).length).toBe(1);
      expect(filterAccounts(accounts, { search: '', type: 'all', status: 'inactive', balance: 'all' }).length).toBe(1);
      expect(filterAccounts(accounts, { search: '', type: 'all', status: 'all', balance: 'negative' }).length).toBe(1);
    });

    it('ordena por maior saldo e coloca principal primeiro', () => {
      const byBalance = sortAccounts(accounts, 'balance-desc', {}, null);
      expect(byBalance[0].id).toBe('a1');
      const byPrimary = sortAccounts(accounts, 'primary', {}, 'a2');
      expect(byPrimary[0].id).toBe('a2');
    });
  });

  describe('periodRange', () => {
    it('mês cobre do dia 1 ao último dia', () => {
      const { fromUtc, toUtc } = periodRange('month', new Date(2026, 6, 15));
      expect(fromUtc <= toUtc).toBeTrue();
      expect(new Date(fromUtc).getMonth()).toBe(new Date(toUtc).getMonth());
    });
    it('ano cobre 12 meses', () => {
      const { fromUtc, toUtc } = periodRange('year', new Date(2026, 6, 15));
      expect(new Date(fromUtc).getFullYear()).toBe(2026);
      expect(new Date(toUtc).getFullYear()).toBe(2026);
    });
  });

  describe('accountTypeLabel', () => {
    it('mapeia tipos', () => {
      expect(accountTypeLabel('Checking')).toBe('Conta corrente');
      expect(accountTypeLabel('Cash')).toBe('Dinheiro');
    });
  });
});
