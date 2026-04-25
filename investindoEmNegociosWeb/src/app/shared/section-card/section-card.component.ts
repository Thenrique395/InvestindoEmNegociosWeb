import { Component, computed, input } from '@angular/core';
import { NgIf } from '@angular/common';

type SectionCardPadding = 'sm' | 'md' | 'lg';

type SectionCardSurface = 'default' | 'muted';

@Component({
  selector: 'app-section-card',
  standalone: true,
  imports: [NgIf],
  template: `
    <section [class]="cardClass()">
      <header *ngIf="title() || description() || hasHeaderActions()" class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0 space-y-1">
          <h2 *ngIf="title()" class="m-0 text-base font-semibold text-[var(--text)]">
            {{ title() }}
          </h2>
          <p *ngIf="description()" class="m-0 text-sm text-[var(--text-muted)]">
            {{ description() }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ng-content select="[card-actions]"></ng-content>
        </div>
      </header>

      <ng-content></ng-content>
    </section>
  `
})
export class SectionCardComponent {
  readonly title = input<string>('');
  readonly description = input<string>('');
  readonly padding = input<SectionCardPadding>('md');
  readonly surface = input<SectionCardSurface>('default');
  readonly hasHeaderActions = input<boolean>(true);

  readonly cardClass = computed(() => {
    const paddingClass = this.resolvePaddingClass(this.padding());
    const surfaceClass = this.surface() === 'muted'
      ? 'bg-[var(--surface-2)]'
      : 'bg-[var(--surface)]';

    return `rounded-2xl border border-[var(--border)] ${surfaceClass} ${paddingClass} shadow-[var(--shadow-sm)]`;
  });

  private resolvePaddingClass(padding: SectionCardPadding): string {
    switch (padding) {
      case 'sm':
        return 'p-3';
      case 'lg':
        return 'p-6';
      default:
        return 'p-4';
    }
  }
}
