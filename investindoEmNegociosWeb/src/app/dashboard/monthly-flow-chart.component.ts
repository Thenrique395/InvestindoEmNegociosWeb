import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { TooltipComponent } from '../shared/tooltip/tooltip.component';
import { MonthlyFlowPoint, hasMonthlyFlowData } from '../utils/monthly-flow.utils';

@Component({
  selector: 'app-monthly-flow-chart',
  standalone: true,
  imports: [CommonModule, RouterModule, AppCurrencyPipe, TooltipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './monthly-flow-chart.component.html',
  styleUrl: './monthly-flow-chart.component.scss'
})
export class MonthlyFlowChartComponent {
  points = input.required<MonthlyFlowPoint[]>();
  title = input('Fluxo mensal');
  subtitle = input('Entradas recebidas e saídas por vencimento, mês a mês.');
  emptyCtaLabel = input('Cadastrar receita');
  emptyCtaLink = input('/receitas');

  readonly hasData = computed(() => hasMonthlyFlowData(this.points()));

  readonly maxValue = computed(() => {
    const max = Math.max(
      1,
      ...this.points().map((point) => Math.max(point.income, point.expense))
    );
    return max;
  });

  barHeight(value: number): number {
    return Math.max(value > 0 ? 4 : 0, Math.round((value / this.maxValue()) * 100));
  }

  balanceTone(balance: number): 'positive' | 'negative' | 'neutral' {
    if (balance > 0) return 'positive';
    if (balance < 0) return 'negative';
    return 'neutral';
  }
}
