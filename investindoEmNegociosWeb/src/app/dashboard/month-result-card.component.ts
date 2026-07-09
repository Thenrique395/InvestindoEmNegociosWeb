import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { TooltipComponent } from '../shared/tooltip/tooltip.component';

/**
 * Card "Resultado do período": saldo principal com composição
 * (base disponível × despesas) e detalhamento do cálculo.
 */
@Component({
  selector: 'app-month-result-card',
  standalone: true,
  imports: [DecimalPipe, AppCurrencyPipe, TooltipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './month-result-card.component.html',
  styleUrl: './month-result-card.component.scss'
})
export class MonthResultCardComponent {
  readonly saldoPrincipal = input.required<number>();
  readonly saldoDelta = input.required<number>();
  readonly saldoAnterior = input.required<number>();
  readonly recebidas = input.required<number>();
  readonly despesas = input.required<number>();
  readonly pendentes = input.required<number>();
  readonly basePercent = input.required<number>();
  readonly despesasPercent = input.required<number>();

  readonly meterLabel = computed(
    () =>
      `Composição do resultado: base disponível ${Math.round(this.basePercent())}% e despesas ${Math.round(this.despesasPercent())}%`
  );
}
