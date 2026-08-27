export type GoalPace = 'done' | 'onTrack' | 'behind' | 'late';

export interface GoalEntry {
  id: string;
  title: string;
  target: number;
  current: number;
  /** Início do acompanhamento em ISO, quando existe. */
  startDate: string | null;
  /** Prazo em ISO, quando existe. */
  targetDate: string | null;
  canceled: boolean;
}

export interface GoalRow {
  id: string;
  title: string;
  current: number;
  target: number;
  /** 0–100. */
  percent: number;
  pace: GoalPace;
  /** O que a cor está dizendo — vira o rótulo acessível da barra. */
  paceLabel: string;
}

/**
 * "Metas" do dashboard — TELAS.md §1: cards com ritmo e quanto falta por mês.
 *
 * A cor é de **conquista**, não de consumo (COMPONENTES.md §9): aqui progresso
 * alto é bom. Verde quando concluída, azul quando o ritmo chega no prazo,
 * âmbar quando está atrás e vermelho quando o prazo já passou sem fechar — o
 * inverso da escala de orçamento, onde encher a barra é o problema.
 */
export function buildGoalRows(entries: readonly GoalEntry[], hoje: Date, limite = 3): GoalRow[] {
  return entries
    .filter((g) => !g.canceled && g.target > 0)
    .map((g) => {
      const percent = Math.max(0, Math.min(100, (g.current / g.target) * 100));
      const pace = resolvePace(g, percent, hoje);
      return {
        id: g.id,
        title: g.title,
        current: g.current,
        target: g.target,
        percent,
        pace,
        paceLabel: PACE_LABELS[pace]
      };
    })
    .sort((a, b) => b.percent - a.percent)
    .slice(0, limite);
}

const PACE_LABELS: Record<GoalPace, string> = {
  done: 'concluída',
  onTrack: 'no ritmo',
  behind: 'atrás do ritmo',
  late: 'prazo vencido'
};

/** Folga antes de acusar atraso: ritmo de meta oscila mês a mês. */
const TOLERANCIA_DE_RITMO = 15;

/**
 * O ritmo compara o quanto já foi guardado com **o quanto do prazo já passou** —
 * não com um limiar fixo de progresso. Uma meta em 20% com três anos pela frente
 * está adiantada, não atrasada; o limiar fixo que existia aqui pintava as duas
 * de âmbar e transformava o card num alarme constante.
 *
 * Sem prazo, ou sem início para medir o decorrido, não há ritmo a comparar: a
 * meta fica "no ritmo" até fechar, e não é acusada por um prazo que ninguém
 * definiu.
 */
function resolvePace(goal: GoalEntry, percent: number, hoje: Date): GoalPace {
  if (percent >= 100) {
    return 'done';
  }

  const prazo = parseData(goal.targetDate);
  if (!prazo) {
    return 'onTrack';
  }
  if (prazo < hoje) {
    return 'late';
  }

  const inicio = parseData(goal.startDate);
  if (!inicio || inicio >= prazo) {
    return 'onTrack';
  }

  const decorrido = ((hoje.getTime() - inicio.getTime()) / (prazo.getTime() - inicio.getTime())) * 100;
  return percent + TOLERANCIA_DE_RITMO >= decorrido ? 'onTrack' : 'behind';
}

function parseData(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const data = new Date(value);
  return Number.isNaN(data.getTime()) ? null : data;
}
