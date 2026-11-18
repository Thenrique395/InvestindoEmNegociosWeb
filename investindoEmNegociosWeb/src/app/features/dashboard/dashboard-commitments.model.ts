import type { StoredExpense, StoredIncome } from '../../core/data/api-data.service';
import { parseLocaleDate } from '../../core/utils/locale-utils';
import { isExpenseOpen, isIncomePending } from '../../core/utils/home-insight.utils';

/** Cash commitments and overdue income, independent of the selected chart period. */
export function buildDashboardCommitments(
  expenses: readonly StoredExpense[],
  incomes: readonly StoredIncome[],
  reference: Date
) {
  const today = new Date(reference);
  today.setHours(0, 0, 0, 0);
  const seteDias = new Date(today);
  seteDias.setDate(seteDias.getDate() + 7);

  let emAtraso = 0;
  let proximosSeteDias = 0;
  let valorEmAberto = 0;
  // Separados porque o card "Precisa da sua atenção" trata os dois casos como
  // pendências diferentes: o que venceu tem ação de pagar, o que vai vencer não.
  let valorEmAtraso = 0;
  let valorProximos = 0;
  let maisAntigoEmAtraso: Date | null = null;
  for (const expense of expenses) {
    if (!isExpenseOpen(expense.status)) continue;
    const due = parseLocaleDate(expense.vencimento);
    if (!due || due > seteDias) continue;
    const valor = expense.valor || 0;
    if (due < today) {
      emAtraso += 1;
      valorEmAtraso += valor;
      if (!maisAntigoEmAtraso || due < maisAntigoEmAtraso) maisAntigoEmAtraso = due;
    } else {
      proximosSeteDias += 1;
      valorProximos += valor;
    }
    valorEmAberto += valor;
  }

  let receitasAtrasadasQtd = 0;
  let receitasAtrasadasValor = 0;
  for (const income of incomes) {
    if (!isIncomePending(income.status)) continue;
    const due = parseLocaleDate(income.recebimento);
    if (!due || due >= today) continue;
    receitasAtrasadasQtd += 1;
    receitasAtrasadasValor += income.valor || 0;
  }

  const diasDoMaisAntigo = maisAntigoEmAtraso
    ? Math.round((today.getTime() - maisAntigoEmAtraso.getTime()) / 86_400_000)
    : null;

  const summary = { emAtraso, proximosSeteDias, valorEmAberto };
  const details = {
    despesasEmAtraso: { quantidade: emAtraso, valor: valorEmAtraso, diasDoMaisAntigo },
    despesasProximas: { quantidade: proximosSeteDias, valor: valorProximos },
    receitasAtrasadas: { quantidade: receitasAtrasadasQtd, valor: receitasAtrasadasValor },
    // Fatura de cartão ainda não tem data de fechamento no dashboard; enquanto
    // não tiver, o item não aparece em vez de aparecer com número inventado.
    faturasFechando: { quantidade: 0, valor: 0 }
  };

  return { summary, details };
}
