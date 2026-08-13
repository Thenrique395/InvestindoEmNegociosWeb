import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FinancialPrivacyService } from '../../financial-privacy.service';
import { formatCurrencyValue } from '../../utils/locale-utils';
import { inject } from '@angular/core';

export type MoneySign = 'auto' | 'always' | 'none';
export type MoneySize = 'sm' | 'md' | 'lg' | 'kpi';

/**
 * Valor monetário — ARQUITETURA_ANGULAR.md §7.
 *
 * "Formata BRL, aplica `tabular-nums`, aplica cor por sinal. Nunca formatar
 * moeda à mão no template."
 *
 * Respeita o modo "ocultar valores" da topbar: quando ligado, mostra `••••••`.
 * É o mesmo comportamento do `AppCurrencyPipe`, que continua existindo para
 * interpolação simples — este componente é para quando a cor e o tamanho também
 * importam.
 */
@Component({
  selector: 'app-money',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="money" [attr.data-tone]="tone()">{{ text() }}</span>`,
  styles: `
    :host { display: inline-block; }
    .money {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      font-weight: var(--fw-semibold);
    }
    .money[data-tone='income'] { color: var(--income-text); }
    .money[data-tone='expense'] { color: var(--expense-text); }
    :host([data-size='sm']) .money { font-size: var(--fs-meta); }
    :host([data-size='md']) .money { font-size: var(--fs-body); }
    :host([data-size='lg']) .money { font-size: var(--fs-card-title); }
    :host([data-size='kpi']) .money {
      font-family: var(--font-display);
      font-size: var(--fs-kpi);
      letter-spacing: var(--ls-tighter);
    }
  `,
  host: { '[attr.data-size]': 'size()' },
})
export class MoneyComponent {
  readonly value = input.required<number>();
  /** `auto` colore por sinal; `none` mantém neutro; `always` força o `+`. */
  readonly sign = input<MoneySign>('none');
  readonly size = input<MoneySize>('md');
  readonly currency = input<string | undefined>(undefined);

  private readonly privacy = inject(FinancialPrivacyService);

  readonly tone = computed(() => {
    if (this.sign() === 'none') return null;
    if (this.value() > 0) return 'income';
    if (this.value() < 0) return 'expense';
    return null;
  });

  readonly text = computed(() => {
    if (this.privacy.hidden()) return '••••••';

    const formatted = formatCurrencyValue(this.value(), this.currency());
    return this.sign() === 'always' && this.value() > 0 ? `+${formatted}` : formatted;
  });
}
