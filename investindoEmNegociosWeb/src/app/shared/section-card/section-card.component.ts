import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';


type SectionCardPadding = 'sm' | 'md' | 'lg';

type SectionCardSurface = 'default' | 'muted';

@Component({
  selector: 'app-section-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <section [class]="cardClass()">
      @if (title() || description() || hasHeaderActions()) {
        <header class="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 space-y-1">
            @if (title()) {
              <h2 class="m-0 text-base font-semibold text-[var(--text)]">
                {{ title() }}
              </h2>
            }
            @if (description()) {
              <p class="m-0 text-sm text-[var(--text-tertiary)]">
                {{ description() }}
              </p>
            }
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <ng-content select="[card-actions]"></ng-content>
          </div>
        </header>
      }
    
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
      ? 'bg-[var(--surface-sunken)]'
      : 'bg-[var(--surface)]';

    return `rounded-[var(--radius-panel)] border border-[var(--border)] ${surfaceClass} ${paddingClass} shadow-[var(--shadow-card-hover)]`;
  });

  private resolvePaddingClass(padding: SectionCardPadding): string {
    switch (padding) {
      case 'sm':
        return 'p-[var(--space-10)]';
      case 'lg':
        return 'p-[var(--space-12)]';
      default:
        return 'p-[var(--space-12)]';
    }
  }
}
