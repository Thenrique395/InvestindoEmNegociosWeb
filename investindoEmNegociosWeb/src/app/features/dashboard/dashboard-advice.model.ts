import type { StoredExpense } from '../../core/data/api-data.service';
import { parseLocaleDate } from '../../core/utils/locale-utils';
import { hasCriticalOverdueExpenseContext, formatCurrency } from '../../core/utils/home-insight.utils';

/** Apresentação dos insights locais: mensagens e prioridade existentes, sem chamadas à IA. */
export function resolveLocalInsightPriority(
  overdueExpensesCount: number,
  overdueExpensesAmount: number,
  projectedBalance: number,
  pendingIncomeAmount: number,
  dueSoonExpenseAmount: number,
  baseBalance: number,
  currentBalance: number
): 'Crítico' | 'Atenção' | 'Estável' {
  if (
    projectedBalance < 0 ||
    hasCriticalOverdueExpenseContext(overdueExpensesCount, overdueExpensesAmount, baseBalance, currentBalance)
  ) {
    return 'Crítico';
  }
  if (pendingIncomeAmount > 0 || dueSoonExpenseAmount > 0) {
    return 'Atenção';
  }
  return 'Estável';
}

export function resolveLocalInsightAction(
  overdueExpensesCount: number,
  overdueExpensesAmount: number,
  projectedBalance: number,
  overdueIncomesCount: number,
  baseBalance: number,
  currentBalance: number
): string {
  if (overdueExpensesCount > 0) {
    const overdueCritical = hasCriticalOverdueExpenseContext(
      overdueExpensesCount,
      overdueExpensesAmount,
      baseBalance,
      currentBalance
    );
    return overdueCritical
      ? `Pague ${overdueExpensesCount} despesa(s) atrasada(s) hoje para evitar agravamento do caixa.`
      : `Você tem saldo para quitar ${overdueExpensesCount} despesa(s) atrasada(s). Pague e dê baixa no sistema.`;
  }
  if (projectedBalance < 0) {
    return `Seu fechamento projetado está negativo. Ajuste gastos ainda hoje para evitar déficit.`;
  }
  if (overdueIncomesCount > 0) {
    return `Confirme as receitas em atraso para corrigir o caixa real do mês.`;
  }
  return `Mantenha o ritmo e acompanhe os próximos vencimentos para fechar o mês com folga.`;
}

export function resolveLocalInsightGoal(
  projectedBalance: number,
  dueSoonExpenseAmount: number,
  overdueExpensesCount: number,
  upcomingDueDays: number
): string {
  if (projectedBalance < 0) {
    return `Meta de curto prazo: recuperar ${formatCurrency(Math.abs(projectedBalance))} para fechar o mês em zero.`;
  }
  if (overdueExpensesCount > 0) {
    return `Meta de curto prazo: zerar despesas atrasadas até o próximo fechamento.`;
  }
  if (dueSoonExpenseAmount > 0) {
    return `Meta de curto prazo: reservar ${formatCurrency(dueSoonExpenseAmount)} para os próximos ${upcomingDueDays} dias.`;
  }
  return `Meta de curto prazo: manter saúde financeira acima de 70/100 até o fim do mês.`;
}

export function resolveLocalInsightDeadline(today: Date, openExpenses: readonly StoredExpense[]): string {
  const nextDue = openExpenses
    .map((expense) => parseLocaleDate(expense.vencimento))
    .filter((date): date is Date => !!date && date >= today)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  if (!nextDue) {
    return 'Sem vencimentos em aberto no período.';
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.round((nextDue.getTime() - today.getTime()) / msPerDay);
  const labelDate = nextDue.toLocaleDateString('pt-BR');
  if (days <= 0) {
    return `Próximo vencimento: hoje (${labelDate}).`;
  }
  return `Próximo vencimento em ${days} dia(s) (${labelDate}).`;
}

