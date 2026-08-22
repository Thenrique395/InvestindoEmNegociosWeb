export interface SpendSlice {
  label: string;
  total: number;
  /** 0–100, do total do período. */
  percent: number;
  /** Token de cor da série, já resolvido por quem monta a fatia. */
  color: string;
}

export interface SpendBreakdownView {
  rows: SpendSlice[];
  /** Frase sobre a concentração do gasto. `null` quando não há o que dizer. */
  insight: string | null;
}

/** Abaixo disso não há "distribuição": há uma categoria e um resto. */
export const MIN_SLICES_PARA_INSIGHT = 3;

/**
 * "Onde o dinheiro foi" — TELAS.md §1: despesas do mês por categoria, da maior
 * para a menor.
 *
 * O insight é sobre **concentração**, não sobre valor: dizer "Moradia: R$ 3.140"
 * repete a linha logo acima; dizer que ela é 51% do total é o que a pessoa não
 * consegue ver olhando as barras.
 */
export function buildSpendBreakdown(slices: readonly SpendSlice[], limite = 4): SpendBreakdownView {
  const ordenadas = [...slices].sort((a, b) => b.total - a.total);
  const rows = ordenadas.slice(0, limite);

  return { rows, insight: buildInsight(ordenadas) };
}

function buildInsight(ordenadas: readonly SpendSlice[]): string | null {
  if (ordenadas.length < MIN_SLICES_PARA_INSIGHT) {
    return null;
  }
  const maior = ordenadas[0];
  if (!maior || maior.percent <= 0) {
    return null;
  }
  return `${maior.label} foi sua maior despesa, com ${formatPercent(maior.percent)} do total.`;
}

function formatPercent(value: number): string {
  const rounded = Math.round(value);
  return `${rounded}%`;
}
