export type UpcomingKind = 'expense' | 'income';

/** Um lançamento cru da agenda, antes de virar linha na tela. */
export interface UpcomingEntry {
  id: string;
  name: string;
  /** Data de vencimento (despesa) ou de recebimento (receita). */
  date: Date;
  amount: number;
  kind: UpcomingKind;
  /** Categoria, cartão ou fonte — o que qualifica o lançamento. */
  context: string;
}

export interface UpcomingRow {
  id: string;
  day: string;
  month: string;
  name: string;
  /** "Serviços · a receber", "Moradia · a pagar". */
  detail: string;
  amount: number;
  kind: UpcomingKind;
  /** Já venceu e continua em aberto. */
  overdue: boolean;
}

export interface UpcomingView {
  rows: UpcomingRow[];
  summary: string;
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/**
 * "Próximos 7 dias" — TELAS.md §1: agenda curta da semana, o que vence e o que
 * há a receber, em ordem de data.
 *
 * Fica de fora o que já apareceu em "Precisa da sua atenção": repetir a mesma
 * conta em dois cards vizinhos faz a pessoa achar que são duas contas. Por isso
 * o vencido não entra aqui — só o que ainda está por vir.
 */
export function buildUpcomingView(entries: readonly UpcomingEntry[], hoje: Date, limite = 6): UpcomingView {
  const inicio = startOfDay(hoje);
  const fim = startOfDay(hoje);
  fim.setDate(fim.getDate() + 7);

  const naJanela = entries
    .filter((e) => {
      const d = startOfDay(e.date);
      return d >= inicio && d <= fim;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const rows = naJanela.slice(0, limite).map((e) => ({
    id: e.id,
    day: String(e.date.getDate()).padStart(2, '0'),
    month: MESES[e.date.getMonth()],
    name: e.name,
    detail: [e.context, e.kind === 'income' ? 'a receber' : 'a pagar'].filter(Boolean).join(' · '),
    amount: e.amount,
    kind: e.kind,
    overdue: startOfDay(e.date) < inicio
  }));

  return { rows, summary: buildSummary(naJanela, fim) };
}

function buildSummary(naJanela: readonly UpcomingEntry[], fim: Date): string {
  const ate = `${String(fim.getDate()).padStart(2, '0')}/${String(fim.getMonth() + 1).padStart(2, '0')}`;
  if (!naJanela.length) {
    return `Nada previsto até ${ate}.`;
  }
  const saidas = naJanela.filter((e) => e.kind === 'expense').length;
  const entradas = naJanela.length - saidas;
  const partes: string[] = [];
  if (saidas) partes.push(saidas === 1 ? '1 saída' : `${saidas} saídas`);
  if (entradas) partes.push(entradas === 1 ? '1 entrada' : `${entradas} entradas`);
  return `${partes.join(' e ')} até ${ate}.`;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
