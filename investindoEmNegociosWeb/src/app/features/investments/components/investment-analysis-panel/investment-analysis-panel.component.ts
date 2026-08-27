import { CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DonutChartComponent, DonutChartItem } from '../../../../shared/donut-chart/donut-chart.component';
import { InvestmentType } from '../../../../core/investments.service';
import { AllocationInvestmentType } from '../../../../core/utils/investments.utils';
import { AppCurrencyPipe } from '../../../../shared/app-currency.pipe';

export type AllocationTargetItem = {
  key: InvestmentType;
  label: string;
  alvo: number;
  atual: number;
  desvio: number;
  suggestedAmount: number;
  alerta: boolean;
};

export type NextInvestmentAction = {
  titulo: string;
  descricao: string;
  cta: string;
};

@Component({
  selector: 'app-investment-analysis-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, AppCurrencyPipe, DonutChartComponent],
  templateUrl: './investment-analysis-panel.component.html',
  styleUrl: './investment-analysis-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvestmentAnalysisPanelComponent {
  @Input() nextAction: NextInvestmentAction = { titulo: '', descricao: '', cta: '' };
  @Input() distributionItems: DonutChartItem[] = [];
  @Input() showConfig = false;
  @Input() allocationTypes: Array<{ value: AllocationInvestmentType; label: string }> = [];
  @Input() targetAllocation: Record<AllocationInvestmentType, number> = {
    RF: 0,
    ACOES: 0,
    FUNDOS: 0,
    CRIPTO: 0
  };
  @Input() targetAllocationTotal = 0;
  @Input() targetItems: AllocationTargetItem[] = [];

  @Output() executeNextAction = new EventEmitter<void>();
  @Output() showConfigChange = new EventEmitter<boolean>();
  @Output() updateTarget = new EventEmitter<{ type: AllocationInvestmentType; value: number }>();
  @Output() resetTarget = new EventEmitter<void>();
  @Output() saveTarget = new EventEmitter<void>();

  trackByIndex(index: number): number {
    return index;
  }

  get mostDistantTarget(): AllocationTargetItem | null {
    return [...this.targetItems].sort((a, b) => Math.abs(b.desvio) - Math.abs(a.desvio))[0] || null;
  }
}
