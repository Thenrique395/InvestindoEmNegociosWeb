import { Component, input } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [NgIf],
  template: `
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0 space-y-2">
        <p *ngIf="eyebrow()" class="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          {{ eyebrow() }}
        </p>
        <h1 class="m-0 text-2xl font-semibold text-[var(--text)]">
          {{ title() }}
        </h1>
        <p *ngIf="description()" class="m-0 max-w-3xl text-sm text-[var(--text-muted)]">
          {{ description() }}
        </p>
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
}
