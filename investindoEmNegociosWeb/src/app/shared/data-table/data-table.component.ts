import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  Directive,
  input,
  output,
  signal,
  TemplateRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import type { ColumnDef, PageState, SortState } from './data-table.types';

/**
 * Célula com conteúdo rico. O `key` casa com o `key` da coluna:
 *
 * ```html
 * <ng-template appCell="status" let-row>
 *   <app-status-badge [status]="row.status" />
 * </ng-template>
 * ```
 */
@Directive({ selector: '[appCell]' })
export class DataTableCellDirective {
  readonly appCell = input.required<string>();
  constructor(readonly template: TemplateRef<unknown>) {}
}

/**
 * Tabela do sistema — COMPONENTES.md §4.
 *
 * Três regras que o handoff trata como não negociáveis:
 *
 * 1. **Uma única definição de coluna** alimenta cabeçalho e linhas. O
 *    `grid-template-columns` é derivado de `columns`, nunca escrito duas vezes.
 * 2. **Sempre dentro de scroller com `min-width`**: a tabela rola dentro da
 *    própria caixa e nunca empurra a página para os lados.
 * 3. **Mobile vira lista de cards**, não scroll horizontal infinito.
 */
@Component({
  selector: 'app-data-table',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent<T extends { id?: string | number }> {
  readonly columns = input.required<readonly ColumnDef<T>[]>();
  readonly rows = input.required<readonly T[]>();

  readonly selectable = input(false);
  readonly sort = input<SortState | null>(null);
  readonly page = input<PageState | null>(null);
  readonly emptyMessage = input('Nada para mostrar.');
  /** Rótulo da linha de total. Ausente esconde a linha. */
  readonly totalLabel = input<string | null>(null);

  readonly sortChange = output<SortState>();
  readonly pageChange = output<number>();
  readonly selectionChange = output<readonly T[]>();
  readonly rowActivate = output<T>();

  private readonly cells = contentChildren(DataTableCellDirective);

  private readonly _selected = signal<Set<string>>(new Set());
  readonly selectedKeys = this._selected.asReadonly();

  /** A grade que cabeçalho e linhas compartilham. */
  readonly gridTemplate = computed(() => {
    const base = this.columns()
      .map((c) => c.width)
      .join(' ');
    return this.selectable() ? `28px ${base}` : base;
  });

  /** Soma das larguras fixas + piso das flexíveis, para o `min-width`. */
  readonly minWidth = computed(() => {
    const total = this.columns().reduce((acc, c) => {
      const fixed = /^(\d+)px$/.exec(c.width);
      if (fixed) return acc + Number(fixed[1]);
      const floor = /minmax\((\d+)px/.exec(c.width);
      return acc + (floor ? Number(floor[1]) : 120);
    }, 0);
    return total + (this.selectable() ? 28 : 0) + this.columns().length * 16;
  });

  readonly allSelected = computed(() => {
    const rows = this.rows();
    return rows.length > 0 && rows.every((r) => this._selected().has(this.keyOf(r)));
  });

  readonly someSelected = computed(() => this._selected().size > 0 && !this.allSelected());

  readonly selectedRows = computed(() =>
    this.rows().filter((r) => this._selected().has(this.keyOf(r))),
  );

  readonly totalPages = computed(() => {
    const page = this.page();
    if (!page || page.size <= 0) return 0;
    return Math.ceil(page.total / page.size);
  });

  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    return Array.from({ length: total }, (_, i) => i);
  });

  templateFor(key: string): TemplateRef<unknown> | null {
    return this.cells().find((c) => c.appCell() === key)?.template ?? null;
  }

  valueOf(row: T, column: ColumnDef<T>): unknown {
    return column.cell ? column.cell(row) : (row as Record<string, unknown>)[column.key];
  }

  keyOf(row: T): string {
    return String(row.id ?? JSON.stringify(row));
  }

  isSelected(row: T): boolean {
    return this._selected().has(this.keyOf(row));
  }

  toggleRow(row: T): void {
    const key = this.keyOf(row);
    const next = new Set(this._selected());
    next.has(key) ? next.delete(key) : next.add(key);
    this._selected.set(next);
    this.selectionChange.emit(this.selectedRows());
  }

  toggleAll(): void {
    const next = this.allSelected() ? new Set<string>() : new Set(this.rows().map((r) => this.keyOf(r)));
    this._selected.set(next);
    this.selectionChange.emit(this.selectedRows());
  }

  clearSelection(): void {
    this._selected.set(new Set());
    this.selectionChange.emit([]);
  }

  onSort(column: ColumnDef<T>): void {
    if (!column.sortable) return;
    const current = this.sort();
    const direction = current?.key === column.key && current.direction === 'asc' ? 'desc' : 'asc';
    this.sortChange.emit({ key: column.key, direction });
  }
}
