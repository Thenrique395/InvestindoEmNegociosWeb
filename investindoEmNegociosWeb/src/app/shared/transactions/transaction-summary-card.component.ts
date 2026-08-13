import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TooltipComponent } from '../tooltip/tooltip.component';

export type TransactionSummaryTone = 'primary' | 'success' | 'warning' | 'info' | 'danger';

/**
 * Card de resumo premium para as telas de Receitas e Despesas.
 * Mantém a mesma API do StatCard (tone/eyebrow/value/note/tooltip + slots
 * [stat-icon] e [stat-note]) porém com o visual compacto do dashboard.
 */
@Component({
  selector: 'app-transaction-summary-card',
  standalone: true,
  imports: [TooltipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="tsc" [attr.data-tone]="tone()">
      <div class="tsc__head">
        <span class="tsc__icon" aria-hidden="true">
          <ng-content select="[stat-icon]"></ng-content>
        </span>
        <div class="tsc__copy">
          <p class="tsc__eyebrow">{{ eyebrow() }}</p>
          <p class="tsc__value">{{ value() }}</p>
        </div>
        @if (tooltipText()) {
          <app-tooltip
            class="tsc__tooltip"
            [label]="tooltipLabel() || ('Mais informações sobre ' + eyebrow())"
            [text]="tooltipText()"
            size="sm" />
        }
      </div>
      <p class="tsc__note">{{ note() }}<ng-content select="[stat-note]"></ng-content></p>
    </article>
  `,
  styles: [`
    :host { display: block; }

    .tsc {
      --tone: var(--primary);
      --tone-text: var(--primary-text);
      --tone-weak: var(--primary-tint);
      --tone-soft: var(--primary-tint);

      display: grid;
      gap: var(--space-4);
      height: 100%;
      padding: var(--card-padding);
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      background: var(--surface);
    }

    .tsc[data-tone='success'] { --tone: var(--income); --tone-text: var(--income-text); --tone-weak: var(--income-tint); --tone-soft: var(--income-tint); }
    .tsc[data-tone='warning'] { --tone: var(--warning); --tone-text: var(--warning-text); --tone-weak: var(--warning-tint); --tone-soft: var(--warning-tint); }
    .tsc[data-tone='info'] { --tone: var(--primary); --tone-text: var(--primary-text); --tone-weak: var(--primary-tint); --tone-soft: var(--primary-tint); }
    .tsc[data-tone='danger'] { --tone: var(--expense); --tone-text: var(--expense-text); --tone-weak: var(--expense-tint); --tone-soft: var(--expense-tint); }

    .tsc__head {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.75rem;
    }

    .tsc__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      inline-size: 30px;
      block-size: 30px;
      flex: none;
      border: none;
      border-radius: var(--radius-sm);
      background: var(--tone-weak);
      color: var(--tone-text);
    }

    .tsc__icon ::ng-deep svg {
      inline-size: 16px;
      block-size: 16px;
    }

    .tsc__copy { min-width: 0; }

    .tsc__eyebrow {
      margin: 0;
      color: var(--text-tertiary);
      font-size: var(--fs-caption);
      font-weight: var(--fw-bold);
      letter-spacing: 0.14em;
      line-height: var(--lh-tight);
      text-transform: uppercase;
    }

    /* Poppins 26px/600 com tracking negativo — o valor é o elemento que
       carrega o card (COMPONENTES.md §3.1). */
    .tsc__value {
      margin: var(--space-4) 0 0;
      color: var(--text);
      font-family: var(--font-display);
      font-size: var(--fs-kpi);
      font-weight: var(--fw-semibold);
      line-height: var(--lh-tight);
      letter-spacing: var(--ls-tighter);
      font-variant-numeric: tabular-nums;
      overflow-wrap: anywhere;
    }

    .tsc__tooltip { align-self: start; }

    .tsc__note {
      margin: var(--space-2) 0 0;
      color: var(--text-tertiary);
      font-size: var(--fs-meta);
      line-height: var(--lh-control);
    }
  `]
})
export class TransactionSummaryCardComponent {
  readonly tone = input<TransactionSummaryTone>('primary');
  readonly eyebrow = input.required<string>();
  readonly value = input.required<string>();
  readonly note = input<string>('');
  readonly tooltipText = input<string>('');
  readonly tooltipLabel = input<string>('');
}
