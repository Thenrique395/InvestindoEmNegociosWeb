import { Component, ContentChildren, EventEmitter, Input, Output, QueryList, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';
import { ResponsiveListCellDirective } from './responsive-list-cell.directive';

export interface ResponsiveListColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'start' | 'end';
  widthClass?: string;
}

@Component({
  selector: 'app-responsive-list',
  standalone: true,
  imports: [NgTemplateOutlet, EmptyStateComponent],
  templateUrl: './responsive-list.component.html',
  styleUrl: './responsive-list.component.scss'
})
export class ResponsiveListComponent<T> {
  @Input() columns: ResponsiveListColumn[] = [];
  @Input() items: T[] = [];
  @Input() getId: (item: T) => string = (item) => String((item as { id?: string })?.id ?? '');

  @Input() sortBy: string | null = null;
  @Input() sortDir: 1 | -1 = 1;

  @Input() loading = false;
  @Input() loadingLabel = 'Carregando...';

  @Input() emptyTitle = 'Nenhum registro encontrado';
  @Input() emptyDescription = 'Crie o primeiro item para começar.';
  @Input() emptyCtaLabel?: string;
  @Input() emptyIcon = '✨';

  @Input() selectable = false;
  @Input() selectedIds: string[] = [];
  @Input() selectableIds: string[] | null = null;

  @Output() sort = new EventEmitter<string>();
  @Output() selectionChange = new EventEmitter<{ id: string; checked: boolean }>();
  @Output() selectAllChange = new EventEmitter<boolean>();
  @Output() emptyAction = new EventEmitter<void>();

  @ContentChildren(ResponsiveListCellDirective) cellDirectives!: QueryList<ResponsiveListCellDirective>;

  cellTemplate(columnKey: string): TemplateRef<{ $implicit: T }> | null {
    const match = this.cellDirectives?.find((cell) => cell.column === columnKey);
    return (match?.template as TemplateRef<{ $implicit: T }>) ?? null;
  }

  sortByColumn(key: string): void {
    this.sort.emit(key);
  }

  isRowSelectable(item: T): boolean {
    if (!this.selectableIds) return true;
    return this.selectableIds.includes(this.getId(item));
  }

  isRowSelected(item: T): boolean {
    return this.selectedIds.includes(this.getId(item));
  }

  get selectableCount(): number {
    return this.items.filter((item) => this.isRowSelectable(item)).length;
  }

  get selectedSelectableCount(): number {
    return this.items.filter((item) => this.isRowSelectable(item) && this.isRowSelected(item)).length;
  }

  get allSelected(): boolean {
    return this.selectableCount > 0 && this.selectedSelectableCount === this.selectableCount;
  }

  get someSelected(): boolean {
    return this.selectedSelectableCount > 0 && this.selectedSelectableCount < this.selectableCount;
  }

  onSelectAllChange(checked: boolean): void {
    this.selectAllChange.emit(checked);
  }

  onRowSelectionChange(item: T, checked: boolean): void {
    this.selectionChange.emit({ id: this.getId(item), checked });
  }

  trackByRow = (_: number, item: T): string => this.getId(item);
}
