/**
 * Cor determinística por categoria — identidade visual estável sem campo no backend.
 * Vive em utils/ porque três telas (Categorias, Despesas, Receitas) dependem dela;
 * manter na feature obrigava import entre features.
 */
export const CATEGORY_PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)'
];

export function colorForCategory(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
  }
  return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length];
}
