export type CategoryVariant = 'expense' | 'income';

export interface CategorySlice {
  label: string;
  total: number;
  percent: number;
  color: string;
  /** Total da mesma categoria no período anterior. `null` = sem histórico comparável. */
  previousTotal?: number | null;
}

const VARIANT_NOUN: Record<CategoryVariant, string> = {
  expense: 'despesas',
  income: 'receitas'
};

/**
 * Insight simples (sem IA) sobre a distribuição das categorias.
 * Retorna `null` quando o plano não libera insight ou não há dados.
 */
export function buildCategoryInsight(
  variant: CategoryVariant,
  slices: CategorySlice[],
  enabled: boolean
): string | null {
  if (!enabled || slices.length === 0) {
    return null;
  }

  const [biggest] = slices;

  if (slices.length === 1) {
    return variant === 'expense'
      ? `Todos os seus gastos estão concentrados em ${biggest.label}.`
      : `Sua renda está concentrada em ${biggest.label}.`;
  }

  const percent = formatPercent(biggest.percent);
  return variant === 'expense'
    ? `${biggest.label} foi sua maior despesa, com ${percent} do total.`
    : `${biggest.label} foi sua maior fonte de renda, com ${percent} do total.`;
}

/**
 * Comparação da maior categoria com o período anterior (planos Inteligente+).
 * Retorna `null` quando não há base anterior comparável.
 */
export function buildCategoryComparison(
  variant: CategoryVariant,
  slices: CategorySlice[],
  enabled: boolean
): string | null {
  if (!enabled || slices.length === 0) {
    return null;
  }

  const [biggest] = slices;
  const previous = biggest.previousTotal;
  if (previous === null || previous === undefined || previous <= 0) {
    return null;
  }

  const change = ((biggest.total - previous) / previous) * 100;
  const prefixo = variant === 'expense' ? `Despesas com ${biggest.label}` : `Receitas de ${biggest.label}`;

  if (Math.abs(change) < 1) {
    return `${prefixo} ficaram estáveis em relação ao período anterior.`;
  }

  const percent = formatPercent(Math.abs(change));
  return change > 0
    ? `${prefixo} subiram ${percent} em relação ao período anterior.`
    : `${prefixo} caíram ${percent} em relação ao período anterior.`;
}

export function categoryCountLabel(count: number): string {
  return count === 1 ? '1 categoria' : `${count} categorias`;
}

export function variantNoun(variant: CategoryVariant): string {
  return VARIANT_NOUN[variant];
}

function formatPercent(value: number): string {
  const rounded = Math.round(value);
  return `${rounded}%`;
}
