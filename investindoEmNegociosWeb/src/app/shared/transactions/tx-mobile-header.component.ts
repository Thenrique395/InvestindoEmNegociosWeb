import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface TxMobileKpi {
  readonly label: string;
  readonly value: string;
  readonly tone?: 'expense' | 'income' | 'neutral';
}

/**
 * Cabeçalho das listagens financeiras no mobile: faixa navy com o total do
 * período, navegação de mês e os totais de apoio.
 *
 * É o padrão de topo de todas as telas de lista no celular — no lugar dos três
 * cartões de KPI do desktop, que empilhados empurravam a lista para fora da
 * primeira dobra.
 */
@Component({
  selector: 'app-tx-mobile-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host { display: block; }

      .tx-mhead {
        padding: var(--space-7) var(--space-7) var(--space-6);
        background: var(--brand-navy);
        color: #fff;
      }

      .tx-mhead__period {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-5);
      }

      .tx-mhead__nav {
        display: grid;
        place-items: center;
        flex: none;
        inline-size: 34px;
        block-size: 34px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 50%;
        background: transparent;
        color: #fff;
        cursor: pointer;

        svg {
          inline-size: 16px;
          block-size: 16px;
          fill: none;
          stroke: currentColor;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
      }

      .tx-mhead__total {
        text-align: center;
        min-inline-size: 0;
      }

      .tx-mhead__label {
        margin: 0;
        font-size: var(--fs-caption);
        font-weight: var(--fw-bold);
        letter-spacing: var(--ls-eyebrow);
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.62);
      }

      .tx-mhead__value {
        margin: var(--space-2) 0 0;
        font-family: var(--font-display);
        font-size: var(--fs-kpi);
        font-weight: var(--fw-semibold);
        letter-spacing: var(--ls-tighter);
        font-variant-numeric: tabular-nums;
      }

      /* Três totais de apoio numa faixa só, divididos por linhas finas. */
      .tx-mhead__kpis {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        margin: var(--space-6) 0 0;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: var(--radius-inner);
        list-style: none;
      }

      .tx-mhead__kpi {
        display: grid;
        gap: 2px;
        padding: var(--space-4) var(--space-5);
        min-inline-size: 0;
      }

      .tx-mhead__kpi + .tx-mhead__kpi {
        border-inline-start: 1px solid rgba(255, 255, 255, 0.12);
      }

      .tx-mhead__kpi-label {
        font-size: var(--fs-caption);
        color: rgba(255, 255, 255, 0.62);
      }

      .tx-mhead__kpi-value {
        font-size: var(--fs-subhead);
        font-weight: var(--fw-semibold);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }

      .tx-mhead__kpi-value[data-tone='expense'] { color: #F08A80; }
      .tx-mhead__kpi-value[data-tone='income'] { color: var(--brand-green-light); }
      .tx-mhead__kpi-value[data-tone='neutral'] { color: #fff; }
    `
  ],
  template: `
    <header class="tx-mhead">
      <div class="tx-mhead__period">
        <button type="button" class="tx-mhead__nav" aria-label="Mês anterior" (click)="previousMonth.emit()">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
        </button>

        <div class="tx-mhead__total">
          <p class="tx-mhead__label">{{ label() }}</p>
          <p class="tx-mhead__value">{{ total() }}</p>
        </div>

        <button type="button" class="tx-mhead__nav" aria-label="Próximo mês" (click)="nextMonth.emit()">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
        </button>
      </div>

      @if (kpis().length) {
        <ul class="tx-mhead__kpis">
          @for (kpi of kpis(); track kpi.label) {
            <li class="tx-mhead__kpi">
              <span class="tx-mhead__kpi-label">{{ kpi.label }}</span>
              <strong class="tx-mhead__kpi-value" [attr.data-tone]="kpi.tone || 'neutral'">{{ kpi.value }}</strong>
            </li>
          }
        </ul>
      }
    </header>
  `
})
export class TxMobileHeaderComponent {
  readonly label = input('Total do período');
  readonly total = input('');
  readonly kpis = input<readonly TxMobileKpi[]>([]);

  readonly previousMonth = output<void>();
  readonly nextMonth = output<void>();
}
