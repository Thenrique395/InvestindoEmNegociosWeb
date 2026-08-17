import { CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InvestmentPosition, InvestmentType } from '../../../investments.service';
import { AppCurrencyPipe } from '../../../shared/app-currency.pipe';
import { FilterBarComponent } from '../../../shared/filter-bar/filter-bar.component';
import { ResponsiveListCellDirective } from '../../../shared/responsive-list/responsive-list-cell.directive';
import { ResponsiveListComponent, ResponsiveListColumn } from '../../../shared/responsive-list/responsive-list.component';
import { StatusBadgeComponent, StatusBadgeTone } from '../../../shared/status-badge/status-badge.component';
import { positionCurrentValue, positionNetContributed } from '../../../utils/investments.utils';

export type InvestmentPositionSortKey =
  | 'asset'
  | 'quantity'
  | 'avgPrice'
  | 'invested'
  | 'currentValue'
  | 'estimatedResult';

@Component({
  selector: 'app-investment-assets-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    AppCurrencyPipe,
    FilterBarComponent,
    ResponsiveListComponent,
    ResponsiveListCellDirective,
    StatusBadgeComponent
  ],
  templateUrl: './investment-assets-list.component.html',
  styleUrl: './investment-assets-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvestmentAssetsListComponent {
  @Input() positions: InvestmentPosition[] = [];
  @Input() pagedPositions: InvestmentPosition[] = [];
  @Input() totalZeroed = 0;
  @Input() totalPages = 1;
  @Input() currentPage = 1;
  @Input() pageLabel = '0 de 0';
  @Input() portfolioValue = 0;
  @Input() tipos: { value: InvestmentType; label: string }[] = [];
  @Input() accounts: string[] = [];
  @Input() searchTerm = '';
  @Input() filterType: 'ALL' | InvestmentType = 'ALL';
  @Input() filterAccount = 'ALL';
  @Input() filterStatus: 'ALL' | 'ACTIVE' | 'ZEROED' = 'ALL';
  @Input() sortBy: InvestmentPositionSortKey = 'asset';
  @Input() sortDir: 'asc' | 'desc' = 'asc';

  @Output() searchTermChange = new EventEmitter<string>();
  @Output() filterTypeChange = new EventEmitter<'ALL' | InvestmentType>();
  @Output() filterAccountChange = new EventEmitter<string>();
  @Output() filterStatusChange = new EventEmitter<'ALL' | 'ACTIVE' | 'ZEROED'>();
  @Output() filtersChanged = new EventEmitter<void>();
  @Output() sort = new EventEmitter<InvestmentPositionSortKey>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() movement = new EventEmitter<InvestmentPosition>();

  readonly columns: ResponsiveListColumn[] = [
    { key: 'asset', label: 'Ativo', sortable: true },
    { key: 'quantity', label: 'Qtd.', sortable: true, align: 'end' },
    { key: 'avgPrice', label: 'Preço médio', sortable: true, align: 'end' },
    { key: 'marketPrice', label: 'Atual', align: 'end' },
    { key: 'invested', label: 'Investido', sortable: true, align: 'end' },
    { key: 'currentValue', label: 'Mercado', sortable: true, align: 'end' },
    { key: 'estimatedResult', label: 'Result.', sortable: true, align: 'end' },
    { key: 'actions', label: 'Ações', align: 'end' }
  ];

  get listSortDir(): 1 | -1 {
    return this.sortDir === 'asc' ? 1 : -1;
  }

  readonly trackPosition = (position: InvestmentPosition): string => position.id;

  updateSearchTerm(value: string): void {
    this.searchTermChange.emit(value);
    this.filtersChanged.emit();
  }

  updateFilterType(value: string): void {
    this.filterTypeChange.emit(value as 'ALL' | InvestmentType);
    this.filtersChanged.emit();
  }

  typeChipLabel(type: 'ALL' | InvestmentType): string {
    if (type === 'ALL') return 'Todos';
    return this.tipos.find((item) => item.value === type)?.label ?? type;
  }

  get typeFilterChips(): ('ALL' | InvestmentType)[] {
    return ['ALL', ...this.tipos.map((item) => item.value)];
  }

  updateFilterAccount(value: string): void {
    this.filterAccountChange.emit(value);
    this.filtersChanged.emit();
  }

  updateFilterStatus(value: string): void {
    this.filterStatusChange.emit(value as 'ALL' | 'ACTIVE' | 'ZEROED');
    this.filtersChanged.emit();
  }

  onSort(column: string): void {
    this.sort.emit(column as InvestmentPositionSortKey);
  }

  marketPrice(position: InvestmentPosition): number | null {
    return position.marketPrice ?? null;
  }

  priceSourceLabel(position: InvestmentPosition): string {
    return this.marketPrice(position) !== null ? 'Cotação' : 'Preço médio';
  }

  priceSourceTone(position: InvestmentPosition): StatusBadgeTone {
    return this.marketPrice(position) !== null ? 'success' : 'muted';
  }

  marketLogo(position: InvestmentPosition): string | null {
    return position.marketLogoUrl ?? null;
  }

  marketLabel(position: InvestmentPosition): string | null {
    return position.marketName ?? null;
  }

  tipoPapel(position: InvestmentPosition): string {
    if (position.type === 'IMOVEL') return 'Patrimônio';
    if (position.type === 'VEICULO') return 'Patrimônio';
    if (position.type === 'FUNDOS') return 'Cotas';
    const ticker = (position.asset || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const match = ticker.match(/(\d{1,2})$/);
    const code = match?.[1] ?? '';

    if (code === '3') return 'ON';
    if (code === '4') return 'PN';
    if (code === '5') return 'PNA';
    if (code === '6') return 'PNB';
    if (code === '11') return position.type === 'ACOES' ? 'UNT' : 'Cotas';
    return '-';
  }

  valorAtualPosicao(position: InvestmentPosition): number {
    return positionCurrentValue(position);
  }

  valorInvestidoPosicao(position: InvestmentPosition): number {
    return positionNetContributed(position);
  }

  resultadoPosicao(position: InvestmentPosition): number {
    return positionCurrentValue(position) - positionNetContributed(position);
  }

  rentabilidadeAtualPercent(position: InvestmentPosition): number {
    const base = positionNetContributed(position);
    return base ? (this.resultadoPosicao(position) / base) * 100 : 0;
  }

  percentualNaCarteira(position: InvestmentPosition): number {
    return this.portfolioValue ? (this.valorAtualPosicao(position) / this.portfolioValue) * 100 : 0;
  }

  variacaoPrecoPercent(position: InvestmentPosition): number | null {
    const market = this.marketPrice(position);
    const avg = position.avgPrice || 0;
    if (market === null || avg <= 0) return null;
    return ((market / avg) - 1) * 100;
  }

  get totalInvested(): number {
    return this.positions.reduce((sum, position) => sum + positionNetContributed(position), 0);
  }

  get totalMarketValue(): number {
    return this.positions.reduce((sum, position) => sum + positionCurrentValue(position), 0);
  }

  get totalResult(): number {
    return this.totalMarketValue - this.totalInvested;
  }

  get quotedPositionsCount(): number {
    return this.positions.filter((position) => this.marketPrice(position) !== null).length;
  }

  get averagePriceFallbackCount(): number {
    return Math.max(this.positions.length - this.quotedPositionsCount, 0);
  }

  get positionsNote(): string {
    return `${this.positions.length} posição(ões) neste filtro · ${this.totalZeroed} zerada(s)`;
  }
}
