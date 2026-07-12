import { LoanContractResponse, LoanInstallmentResponse } from '../loans.service';
import { StatusBadgeTone } from '../shared/status-badge/status-badge.component';

/**
 * Modelo puro de Empréstimos. Deriva o acompanhamento a partir dos dados reais
 * do contrato (parcelas, status, vencimentos). Sem inventar valores.
 */

export interface LoanContractView {
  contract: LoanContractResponse;
  paidCount: number;
  totalCount: number;
  /** % de parcelas pagas (0–100). */
  paidPercent: number;
  nextInstallment: LoanInstallmentResponse | null;
  statusLabel: string;
  statusTone: StatusBadgeTone;
}

export interface LoansOverview {
  totalOpenBalance: number;
  totalMonthly: number;
  totalOpenInstallments: number;
  contractsCount: number;
  activeCount: number;
  nextDueDate: string | null;
  nextDueAmount: number;
  paidPercent: number;
}

function parseIso(value?: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function openInstallments(contract: LoanContractResponse): LoanInstallmentResponse[] {
  return (contract.installments || [])
    .filter((i) => i.status === 'Open')
    .sort((a, b) => (parseIso(a.dueDate)?.getTime() ?? 0) - (parseIso(b.dueDate)?.getTime() ?? 0));
}

export function buildContractView(contract: LoanContractResponse): LoanContractView {
  const installments = contract.installments || [];
  const totalCount = installments.length;
  const paidCount = installments.filter((i) => i.status === 'Paid').length;
  const open = openInstallments(contract);
  const isClosed = contract.status === 'Closed' || (totalCount > 0 && paidCount === totalCount);

  return {
    contract,
    paidCount,
    totalCount,
    paidPercent: totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0,
    nextInstallment: open[0] ?? null,
    statusLabel: isClosed ? 'Quitado' : 'Ativo',
    statusTone: isClosed ? 'success' : 'info'
  };
}

export function buildContractViews(contracts: LoanContractResponse[]): LoanContractView[] {
  return (contracts || []).map(buildContractView);
}

export function buildLoansOverview(contracts: LoanContractResponse[]): LoansOverview {
  const views = buildContractViews(contracts);
  const activeViews = views.filter((v) => v.statusLabel === 'Ativo');

  const totalOpenBalance = views.reduce((s, v) => s + Number(v.contract.openBalance || 0), 0);
  const totalMonthly = activeViews.reduce((s, v) => s + Number(v.contract.monthlyPayment || 0), 0);
  const totalOpenInstallments = views.reduce((s, v) => s + Number(v.contract.openInstallments || 0), 0);

  const totalInstallments = views.reduce((s, v) => s + v.totalCount, 0);
  const paidInstallments = views.reduce((s, v) => s + v.paidCount, 0);

  let nextDate: Date | null = null;
  let nextDueDate: string | null = null;
  let nextAmount = 0;

  for (const view of views) {
    const next = view.nextInstallment;
    if (!next) continue;
    const due = parseIso(next.dueDate);
    if (due && (!nextDate || due < nextDate)) {
      nextDate = due;
      nextDueDate = next.dueDate;
      nextAmount = Number(next.totalAmount || 0);
    }
  }

  return {
    totalOpenBalance,
    totalMonthly,
    totalOpenInstallments,
    contractsCount: views.length,
    activeCount: activeViews.length,
    nextDueDate,
    nextDueAmount: nextAmount,
    paidPercent: totalInstallments > 0 ? Math.round((paidInstallments / totalInstallments) * 100) : 0
  };
}
