import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface TxFilterChip {
  readonly value: string;
  readonly label: string;
  readonly meta?: string;
}

/**
 * Filtro de status no mobile: chips numa faixa rolável, no lugar do dropdown.
 * Em tela de celular um `select` esconde as opções atrás de um toque; os chips
 * mostram para onde dá para ir e quantos itens há em cada lugar.
 */
@Component({
  selector: 'app-tx-filter-chips',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host { display: block; }

      .tx-chips {
        display: flex;
        gap: var(--space-3);
        padding: var(--space-6) var(--space-7);
        overflow-x: auto;
        scrollbar-width: none;
        background: var(--surface);
      }

      .tx-chips::-webkit-scrollbar {
        display: none;
      }

      .tx-chips__item {
        flex: none;
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        block-size: 36px;
        padding: 0 var(--space-6);
        border: 1px solid var(--border);
        border-radius: var(--radius-pill);
        background: var(--surface);
        color: var(--text-secondary);
        font: inherit;
        font-size: var(--fs-body);
        font-weight: var(--fw-semibold);
        white-space: nowrap;
        cursor: pointer;
      }

      .tx-chips__item.is-active {
        border-color: var(--brand-navy);
        background: var(--brand-navy);
        color: #fff;
      }

      .tx-chips__meta {
        font-size: var(--fs-caption);
        opacity: 0.7;
      }
    `
  ],
  template: `
    <div class="tx-chips" role="tablist" [attr.aria-label]="ariaLabel()">
      @for (chip of chips(); track chip.value) {
        <button
          type="button"
          role="tab"
          class="tx-chips__item"
          [class.is-active]="chip.value === selected()"
          [attr.aria-selected]="chip.value === selected()"
          (click)="select.emit(chip.value)">
          {{ chip.label }}
          @if (chip.meta) {
            <span class="tx-chips__meta">{{ chip.meta }}</span>
          }
        </button>
      }
    </div>
  `
})
export class TxFilterChipsComponent {
  readonly chips = input<readonly TxFilterChip[]>([]);
  readonly selected = input('');
  readonly ariaLabel = input('Filtrar por status');

  readonly select = output<string>();
}
