export type RecurrenceDirection = 'income' | 'expense';

export interface RecurrenceEntry {
  id: string;
  title: string;
  amount: number;
  direction: RecurrenceDirection;
  /** Dia do mês em que se repete. `null` quando a data não é legível. */
  day: number | null;
  /** Categoria, para o rótulo e a cor da faixa lateral. */
  category: string;
  /** Já foi pago/recebido neste mês. */
  settled: boolean;
}

export interface RecurrenceRow {
  id: string;
  title: string;
  amount: number;
  direction: RecurrenceDirection;
  /** "todo dia 05 · Moradia". */
  detail: string;
  /** Índice 1..8 da paleta de séries — a faixa colorida à esquerda do card. */
  colorIndex: number;
}

export interface RecurrencesView {
  rows: RecurrenceRow[];
  outflowTotal: number;
  incomeTotal: number;
  /** Quanto as saídas fixas pesam na renda recorrente. `null` sem renda. */
  incomeShare: number | null;
  /** Próxima saída fixa a vencer, já formatada. `null` se todas quitadas. */
  nextDue: { title: string; day: number } | null;
}

/**
 * "Recorrências do mês" — TELAS.md §1: assinaturas, contas fixas e parcelas,
 * com cor da categoria, dia de recorrência e valor; rodapé com total fixo de
 * saídas, peso na renda e contagem.
 *
 * O peso na renda usa a renda **recorrente**, não a do período: comparar conta
 * fixa com uma receita avulsa de um mês bom faria o peso despencar sem que nada
 * tivesse melhorado.
 */
export function buildRecurrencesView(entries: readonly RecurrenceEntry[], limite = 9): RecurrencesView {
  const ordenadas = [...entries].sort((a, b) => {
    if (a.direction !== b.direction) return a.direction === 'expense' ? -1 : 1;
    return b.amount - a.amount;
  });

  const outflowTotal = soma(entries, 'expense');
  const incomeTotal = soma(entries, 'income');

  const aVencer = entries
    .filter((e) => e.direction === 'expense' && !e.settled && e.day !== null)
    .sort((a, b) => (a.day ?? 0) - (b.day ?? 0))[0];

  return {
    rows: ordenadas.slice(0, limite).map((e) => ({
      id: e.id,
      title: e.title,
      amount: e.amount,
      direction: e.direction,
      detail: [e.day !== null ? `todo dia ${String(e.day).padStart(2, '0')}` : null, e.category]
        .filter(Boolean)
        .join(' · '),
      colorIndex: corDaCategoria(e.category)
    })),
    outflowTotal,
    incomeTotal,
    incomeShare: incomeTotal > 0 ? (outflowTotal / incomeTotal) * 100 : null,
    nextDue: aVencer ? { title: aVencer.title, day: aVencer.day! } : null
  };
}

function soma(entries: readonly RecurrenceEntry[], direction: RecurrenceDirection): number {
  return entries.filter((e) => e.direction === direction).reduce((total, e) => total + e.amount, 0);
}

/**
 * Cor estável por nome de categoria. Um hash simples em vez do índice da lista:
 * assim "Moradia" fica da mesma cor mesmo quando a ordem dos itens muda de um
 * mês para o outro — cor que dança entre meses não serve para reconhecer nada.
 */
function corDaCategoria(category: string): number {
  if (!category) return 8;
  let hash = 0;
  for (const char of category) {
    hash = (hash * 31 + char.charCodeAt(0)) % 997;
  }
  return (hash % 7) + 1;
}
