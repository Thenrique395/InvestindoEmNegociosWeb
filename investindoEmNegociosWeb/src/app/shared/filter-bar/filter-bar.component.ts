import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Faixa de filtros de uma listagem.
 *
 * `variant="bare"` tira a moldura: nas telas de lançamentos os filtros ficam
 * soltos sobre o fundo da página, entre o painel do período e a tabela — dois
 * cartões encostados criavam uma borda dupla que não separava nada.
 */
@Component({
  selector: 'app-filter-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="containerClass()">
      <div class="flex flex-wrap items-center gap-2">
        <ng-content select="[filter-left]"></ng-content>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <ng-content select="[filter-right]"></ng-content>
      </div>
    </div>
  `
})
export class FilterBarComponent {
  readonly sticky = input<boolean>(false);
  readonly variant = input<'card' | 'bare'>('card');

  protected readonly containerClass = computed(() => {
    const base = 'flex flex-wrap items-center justify-between gap-3';
    return this.variant() === 'bare'
      ? base
      : `${base} rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface)] p-4`;
  });
}
