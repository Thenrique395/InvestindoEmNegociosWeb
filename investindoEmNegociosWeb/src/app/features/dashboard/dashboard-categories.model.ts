import type { CategorySlice } from './category-breakdown/category-breakdown.model';

type CategoryEntry = { valor: number; categoria?: string };
/** Aggregates current entries, preserving previous totals only for comparable labels. */
export function buildDashboardCategories(
  current: readonly CategoryEntry[],
  previous: readonly CategoryEntry[],
  palette: readonly string[]
): { total: number; slices: CategorySlice[] } {
  const groupByLabel = <T extends { valor: number }>(
    items: readonly T[],
    labelGetter: (item: T) => string
  ): { label: string; total: number }[] => {
    const map = new Map<string, number>();
    for (const item of items) {
      const label = labelGetter(item).trim() || 'Sem categoria';
      map.set(label, (map.get(label) || 0) + (item.valor || 0));
    }
    return Array.from(map.entries())
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total);
  };

  const cap = (items: { label: string; total: number }[], limit = 6) => {
    if (items.length <= limit) return items;
    const head = items.slice(0, limit - 1);
    const rest = items.slice(limit - 1).reduce((sum, item) => sum + item.total, 0);
    return [...head, { label: 'Outros', total: rest }];
  };

  const toTotalsMap = (items: { label: string; total: number }[]): Map<string, number> =>
    new Map(items.map((item) => [item.label, item.total]));

  const previousByLabel = toTotalsMap(groupByLabel(previous, item => item.categoria || 'Sem categoria'));
  const data = cap(groupByLabel(current, item => item.categoria || 'Sem categoria'));
  const total = data.reduce((sum, item) => sum + item.total, 0);
  return { total, slices: data.map((item, index) => toCategorySlice(item, index, total, palette, previousByLabel)) };
}
function toCategorySlice(
  item: { label: string; total: number },
  index: number,
  total: number,
  palette: readonly string[],
  previousByLabel: Map<string, number>
): CategorySlice {
  // "Outros" agrega categorias diferentes entre períodos — não é comparável.
  const previousTotal = item.label === 'Outros' ? null : previousByLabel.get(item.label) ?? null;
  return {
    label: item.label,
    total: item.total,
    percent: total > 0 ? (item.total / total) * 100 : 0,
    color: palette[index % palette.length],
    previousTotal
  };
}
