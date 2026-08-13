/**
 * Definição de coluna — ARQUITETURA_ANGULAR.md §7.
 *
 * O `grid-template-columns` é derivado de `columns.map(c => c.width)` e usado
 * **no cabeçalho e em cada linha**. É a única forma de garantir que os dois
 * nunca desalinhem: escrever a grade duas vezes é o erro nº 2 da lista dos
 * cinco que mais custam (§13).
 */
export interface ColumnDef<T> {
  key: string;
  label: string;
  /** `'112px'` para valor e ação; `'minmax(180px,2.1fr)'` para conteúdo variável. */
  width: string;
  align?: 'left' | 'right' | 'center';
  /** Texto simples. Para conteúdo rico, use um template por `key`. */
  cell?: (row: T) => unknown;
  sortable?: boolean;
}

export interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

export interface PageState {
  index: number;
  size: number;
  total: number;
}
