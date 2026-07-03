import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppCurrencyPipe } from '../app-currency.pipe';

export interface DonutChartItem {
  label: string;
  value: number;
  percent: number;
  color: string;
}

@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [CommonModule, AppCurrencyPipe],
  templateUrl: './donut-chart.component.html',
  styleUrl: './donut-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DonutChartComponent {
  items = input.required<DonutChartItem[]>();
  emptyMessage = input('Sem dados para exibir.');

  conicGradient = computed(() => {
    const parts: string[] = [];
    let cursor = 0;
    for (const item of this.items()) {
      const next = cursor + item.percent;
      parts.push(`${item.color} ${cursor}% ${next}%`);
      cursor = next;
    }
    return parts.length ? `conic-gradient(${parts.join(', ')})` : 'conic-gradient(var(--color-border-strong) 0 100%)';
  });
}
