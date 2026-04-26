import { Component, computed, input } from '@angular/core';
import { NgIf } from '@angular/common';

type PageHeaderSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [NgIf],
  template: `
    <header [class]="containerClass()">
      <div class="min-w-0 space-y-2">
        <p *ngIf="eyebrow()" class="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          {{ eyebrow() }}
        </p>

        <h1 [class]="titleClass()">
          {{ title() }}
        </h1>

        <p *ngIf="description()" class="m-0 max-w-3xl text-sm text-[var(--text-muted)]">
          {{ description() }}
        </p>

        <div *ngIf="hasMeta()" class="flex flex-wrap items-center gap-2 pt-1 text-xs text-[var(--text-muted)]">
          <ng-content select="[page-meta]"></ng-content>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <ng-content select="[page-actions]"></ng-content>
      </div>
    </header>
  `
})
export class PageHeaderComponent {
  readonly eyebrow = input<string>('');
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly size = input<PageHeaderSize>('md');
  readonly elevated = input<boolean>(false);
  readonly hasMeta = input<boolean>(true);

  readonly containerClass = computed(() => {
    const base = 'flex flex-wrap items-start justify-between gap-4';
    if (!this.elevated()) return base;
    return `${base} rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]`;
  });

  readonly titleClass = computed(() => {
    const sizeClass = this.size() === 'lg'
      ? 'text-3xl'
      : this.size() === 'sm'
        ? 'text-xl'
        : 'text-2xl';

    return `m-0 font-semibold text-[var(--text)] ${sizeClass}`;
  });
}
