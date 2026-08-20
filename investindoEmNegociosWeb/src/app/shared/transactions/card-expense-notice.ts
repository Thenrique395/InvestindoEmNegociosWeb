import { monthKeyFromLocaleDate } from '../../utils/locale-utils';
import { monthLabelFromKey } from './transaction-helpers';

/**
 * Onde as despesas de cartão foram parar.
 *
 * Compra no cartão não cai no mês da compra: ela entra na competência da
 * fatura, que depende do dia de fechamento. Nas duas telas em que isso
 * confunde — o lançamento em Despesas e a remoção em Cartões — a pessoa
 * precisa saber **em que mês** procurar.
 */

/** Item mínimo para as duas mensagens: só a data importa. */
export interface DatedExpense {
  readonly vencimento?: string;
}

/** Meses (YYYY-MM) em que a lista tem lançamentos, sem repetir e em ordem. */
export function expenseMonthKeys(expenses: readonly DatedExpense[]): string[] {
  const chaves = expenses
    .map((expense) => monthKeyFromLocaleDate(expense.vencimento || ''))
    .filter((chave): chave is string => !!chave);

  return [...new Set(chaves)].sort();
}

/**
 * Mês para o qual o lançamento foi, quando não é o mês aberto na tela.
 *
 * `null` quando caiu no mês aberto (nada a avisar) ou quando não há data
 * legível — nesse caso um aviso mandaria a pessoa procurar em lugar nenhum.
 */
export function statementNoticeMonth(mesAberto: string, mesesDoLancamento: readonly string[]): string | null {
  const foraDoMes = mesesDoLancamento.filter((mes) => mes !== mesAberto).sort();
  return foraDoMes[0] ?? null;
}

/** "Lançada na fatura de setembro de 2026. Abra esse mês para vê-la." */
export function statementNoticeMessage(mesDaFatura: string): string {
  return `Lançada na fatura de ${monthLabelFromKey(mesDaFatura)}. Abra esse mês para vê-la.`;
}

/**
 * Recusa da remoção do cartão, dizendo quantas despesas existem e onde.
 *
 * A mensagem antiga era "existem despesas vinculadas a ele" — verdadeira e
 * inútil: as despesas podiam estar em competências futuras, invisíveis no mês
 * aberto, e não havia como saber onde procurar.
 */
export function cardRemovalBlockMessage(expenses: readonly DatedExpense[]): string {
  const total = expenses.length;
  const meses = expenseMonthKeys(expenses);
  const plural = total === 1 ? 'despesa vinculada' : 'despesas vinculadas';

  if (meses.length === 0) {
    return `Este cartão tem ${total} ${plural}. Exclua essas despesas ou troque a forma de pagamento antes de removê-lo.`;
  }

  const rotulos = meses.map((mes) => monthLabelFromKey(mes));
  const onde =
    rotulos.length === 1
      ? rotulos[0]
      : `${rotulos.slice(0, -1).join(', ')} e ${rotulos[rotulos.length - 1]}`;

  return `Este cartão tem ${total} ${plural} em ${onde}. Exclua essas despesas ou troque a forma de pagamento antes de removê-lo.`;
}
