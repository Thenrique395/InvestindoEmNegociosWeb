import { AccountResponse, AccountTransactionResponse, AccountType } from '../accounts.service';
import { DonutChartItem } from '../shared/donut-chart/donut-chart.component';

/**
 * Modelo puro da Central de Contas.
 *
 * Deriva totais, distribuição e atividade por conta exclusivamente de dados
 * reais (contas + transações). Transferências (`type: 'Transfer'`) NÃO entram
 * como entrada/saída — são contabilizadas à parte, preservando as regras do
 * produto.
 */

export type AccountPeriod = 'month' | 'quarter' | 'year';
export type AccountSort = 'balance-desc' | 'balance-asc' | 'name' | 'recent' | 'primary';
export type BalanceFilter = 'all' | 'positive' | 'negative';
export type StatusFilter = 'all' | 'active' | 'inactive';

export interface AccountActivity {
  accountId: string;
  income: number;
  expense: number;
  transferIn: number;
  transferOut: number;
  net: number;
  movementCount: number;
  lastMovementAt: string | null;
}

export interface AccountsFilters {
  search: string;
  type: AccountType | 'all';
  status: StatusFilter;
  balance: BalanceFilter;
}

export interface AccountsOverview {
  totalBalance: number;
  activeCount: number;
  totalCount: number;
  primaryAccountId: string | null;
  totalIncome: number;
  totalExpense: number;
  hasNegative: boolean;
  distribution: DonutChartItem[];
}

export const ACCOUNT_CHART_PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)'
];

export function emptyActivity(accountId: string): AccountActivity {
  return { accountId, income: 0, expense: 0, transferIn: 0, transferOut: 0, net: 0, movementCount: 0, lastMovementAt: null };
}

export function accountTypeLabel(type: AccountType): string {
  switch (type) {
    case 'Checking': return 'Conta corrente';
    case 'Savings': return 'Poupança';
    case 'DigitalWallet': return 'Carteira digital';
    case 'Cash': return 'Dinheiro';
    default: return 'Outro';
  }
}

/** Intervalo [fromUtc, toUtc] do período, ancorado em `ref` (hoje por padrão). */
export function periodRange(period: AccountPeriod, ref: Date = new Date()): { fromUtc: string; toUtc: string } {
  const year = ref.getFullYear();
  const month = ref.getMonth();
  let start: Date;
  let end: Date;

  if (period === 'year') {
    start = new Date(year, 0, 1, 0, 0, 0, 0);
    end = new Date(year, 11, 31, 23, 59, 59, 999);
  } else if (period === 'quarter') {
    const quarterStartMonth = Math.floor(month / 3) * 3;
    start = new Date(year, quarterStartMonth, 1, 0, 0, 0, 0);
    end = new Date(year, quarterStartMonth + 3, 0, 23, 59, 59, 999);
  } else {
    start = new Date(year, month, 1, 0, 0, 0, 0);
    end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  }

  return { fromUtc: start.toISOString(), toUtc: end.toISOString() };
}

/** Agrega as transações reais de uma conta, separando transferências. */
export function buildAccountActivity(accountId: string, transactions: AccountTransactionResponse[]): AccountActivity {
  const activity = emptyActivity(accountId);
  let lastMs = -Infinity;

  for (const tx of transactions || []) {
    const amount = Number(tx.amount) || 0;
    if (tx.type === 'Transfer') {
      if (tx.kind === 'Credit') activity.transferIn += amount;
      else activity.transferOut += amount;
    } else if (tx.kind === 'Credit') {
      // Entrada/saída seguem a direção do dinheiro (kind), não o rótulo do tipo:
      // isso classifica corretamente estornos (ex.: Expense + Credit = dinheiro que entrou).
      activity.income += amount;
    } else {
      activity.expense += amount;
    }

    activity.movementCount += 1;
    const ms = Date.parse(tx.occurredAt);
    if (!Number.isNaN(ms) && ms > lastMs) {
      lastMs = ms;
      activity.lastMovementAt = tx.occurredAt;
    }
  }

  activity.net = activity.income - activity.expense;
  return activity;
}

export function buildActivityMap(byAccount: Record<string, AccountTransactionResponse[]>): Record<string, AccountActivity> {
  const map: Record<string, AccountActivity> = {};
  for (const accountId of Object.keys(byAccount || {})) {
    map[accountId] = buildAccountActivity(accountId, byAccount[accountId]);
  }
  return map;
}

/** Distribuição de saldo por conta ativa com saldo positivo (para o donut). */
export function distributionFor(accounts: AccountResponse[]): DonutChartItem[] {
  const positives = (accounts || []).filter((a) => a.isActive && Number(a.currentBalance) > 0);
  const total = positives.reduce((sum, a) => sum + Number(a.currentBalance || 0), 0);
  if (total <= 0) return [];

  return positives
    .slice()
    .sort((a, b) => Number(b.currentBalance) - Number(a.currentBalance))
    .map((account, index) => ({
      label: account.name,
      value: Number(account.currentBalance || 0),
      percent: (Number(account.currentBalance || 0) / total) * 100,
      color: ACCOUNT_CHART_PALETTE[index % ACCOUNT_CHART_PALETTE.length]
    }));
}

export function buildAccountsOverview(
  accounts: AccountResponse[],
  activityMap: Record<string, AccountActivity>,
  primaryAccountId: string | null
): AccountsOverview {
  const list = accounts || [];
  const active = list.filter((a) => a.isActive);
  const totalBalance = active.reduce((sum, a) => sum + Number(a.currentBalance || 0), 0);

  let totalIncome = 0;
  let totalExpense = 0;
  for (const account of active) {
    const activity = activityMap[account.id];
    if (activity) {
      totalIncome += activity.income;
      totalExpense += activity.expense;
    }
  }

  return {
    totalBalance,
    activeCount: active.length,
    totalCount: list.length,
    primaryAccountId,
    totalIncome,
    totalExpense,
    hasNegative: active.some((a) => Number(a.currentBalance) < 0),
    distribution: distributionFor(list)
  };
}

export function filterAccounts(accounts: AccountResponse[], filters: AccountsFilters): AccountResponse[] {
  const search = (filters.search || '').trim().toLowerCase();
  return (accounts || []).filter((account) => {
    if (search && !account.name.toLowerCase().includes(search)) return false;
    if (filters.type !== 'all' && account.type !== filters.type) return false;
    if (filters.status === 'active' && !account.isActive) return false;
    if (filters.status === 'inactive' && account.isActive) return false;
    if (filters.balance === 'positive' && Number(account.currentBalance) < 0) return false;
    if (filters.balance === 'negative' && Number(account.currentBalance) >= 0) return false;
    return true;
  });
}

export function sortAccounts(
  accounts: AccountResponse[],
  sort: AccountSort,
  activityMap: Record<string, AccountActivity>,
  primaryAccountId: string | null
): AccountResponse[] {
  const list = (accounts || []).slice();
  const byName = (a: AccountResponse, b: AccountResponse) => a.name.localeCompare(b.name, 'pt-BR');

  switch (sort) {
    case 'balance-asc':
      return list.sort((a, b) => Number(a.currentBalance) - Number(b.currentBalance) || byName(a, b));
    case 'name':
      return list.sort(byName);
    case 'recent':
      return list.sort((a, b) => lastMovementMs(activityMap[b.id]) - lastMovementMs(activityMap[a.id]) || byName(a, b));
    case 'primary':
      return list.sort(
        (a, b) =>
          Number(b.id === primaryAccountId) - Number(a.id === primaryAccountId) ||
          Number(b.currentBalance) - Number(a.currentBalance) ||
          byName(a, b)
      );
    case 'balance-desc':
    default:
      return list.sort((a, b) => Number(b.currentBalance) - Number(a.currentBalance) || byName(a, b));
  }
}

function lastMovementMs(activity: AccountActivity | undefined): number {
  if (!activity?.lastMovementAt) return -Infinity;
  const ms = Date.parse(activity.lastMovementAt);
  return Number.isNaN(ms) ? -Infinity : ms;
}
