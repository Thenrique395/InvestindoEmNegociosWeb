import { CommonModule } from '@angular/common';
import { Component, ContentChild, Input, TemplateRef } from '@angular/core';

export interface ResponsiveListColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  value?: (item: T) => string | number | null | undefined;
  className?: string;
}

@Component({
  selector: 'app-responsive-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './responsive-list.component.html'
})
export class ResponsiveListComponent<T = unknown> {
  @Input() items: T[] = [];
  @Input() columns: ResponsiveListColumn<T>[] = [];
  @Input() trackByKey?: keyof T;
  @Input() emptyTitle = 'Nenhum registro encontrado';
  @Input() emptyDescription = 'Quando houver dados, eles aparecerão aqui.';

  @ContentChild('desktopRow', { read: TemplateRef }) desktopRowTemplate?: TemplateRef<{ $implicit: T; item: T }>;
  @ContentChild('mobileCard', { read: TemplateRef }) mobileCardTemplate?: TemplateRef<{ $implicit: T; item: T }>;

  trackByItem = (index: number, item: T): unknown => {
    if (!this.trackByKey || item == null || typeof item !== 'object') return index;
    return (item as Record<string, unknown>)[String(this.trackByKey)] ?? index;
  };

  getValue(item: T, column: ResponsiveListColumn<T>): string | number {
    const value = column.value ? column.value(item) : (item as Record<string, unknown>)?.[column.key];
    return value == null ? '-' : value as string | number;
  }

  alignClass(column: ResponsiveListColumn<T>): string {
    if (column.align === 'right') return 'text-right';
    if (column.align === 'center') return 'text-center';
    return 'text-left';
  }
}
