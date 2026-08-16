import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InvestmentType } from '../../../investments.service';
import { AppCurrencyPipe } from '../../../shared/app-currency.pipe';
import { FilterBarComponent } from '../../../shared/filter-bar/filter-bar.component';
import { ResponsiveListCellDirective } from '../../../shared/responsive-list/responsive-list-cell.directive';
import { ResponsiveListComponent, ResponsiveListColumn } from '../../../shared/responsive-list/responsive-list.component';

export type ConsolidationBucket = { key: string; label: string; compras: number; vendas: number };
export type ConsolidationMovementRow = {
  id: string;
  asset: string;
  investmentType: InvestmentType;
  ordem: 'Compra' | 'Venda';
  quantity: number;
  unitPrice: number;
  total: number;
  quantityAfter: number;
  date: string;
  source: 'B3' | 'Manual';
};

@Component({
  selector: 'app-investment-consolidation-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppCurrencyPipe,
    FilterBarComponent,
    ResponsiveListComponent,
    ResponsiveListCellDirective
  ],
  templateUrl: './investment-consolidation-panel.component.html',
  styleUrl: './investment-consolidation-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvestmentConsolidationPanelComponent {
  @Input() series: ConsolidationBucket[] = [];
  @Input() chartMax = 1;
  @Input() rows: ConsolidationMovementRow[] = [];
  @Input() horizonYears = 2;
  @Input() typeFilter: 'ALL' | InvestmentType = 'ALL';
  @Input() searchTerm = '';
  @Input() tipos: { value: InvestmentType; label: string }[] = [];

  @Output() horizonYearsChange = new EventEmitter<number>();
  @Output() typeFilterChange = new EventEmitter<'ALL' | InvestmentType>();
  @Output() searchTermChange = new EventEmitter<string>();

  readonly columns: ResponsiveListColumn[] = [
    { key: 'asset', label: 'Ativo' },
    { key: 'investmentType', label: 'Tipo de investimento' },
    { key: 'ordem', label: 'Tipo de ordem' },
    { key: 'quantity', label: 'Quantidade', align: 'end' },
    { key: 'unitPrice', label: 'Preço unitário', align: 'end' },
    { key: 'total', label: 'Total', align: 'end' },
    { key: 'quantityAfter', label: 'Quantidade total', align: 'end' },
    { key: 'date', label: 'Data do lançamento' },
    { key: 'source', label: 'Fonte' }
  ];

  readonly gridLines = [1, 2, 3, 4, 5];

  get totalCompras(): number {
    return this.rows
      .filter((row) => row.ordem === 'Compra')
      .reduce((total, row) => total + row.total, 0);
  }

  get totalVendas(): number {
    return this.rows
      .filter((row) => row.ordem === 'Venda')
      .reduce((total, row) => total + row.total, 0);
  }

  get saldoPeriodo(): number {
    return this.totalCompras - this.totalVendas;
  }

  get totalLancamentos(): number {
    return this.rows.length;
  }

  trackByIndex(index: number): number {
    return index;
  }

  investmentTypeLabel(type: InvestmentType): string {
    return this.tipos.find((t) => t.value === type)?.label || type;
  }
}
