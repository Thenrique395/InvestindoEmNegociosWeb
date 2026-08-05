import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, NgZone, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReportsService, CategoryExpenseResponse, MonthlySummaryReportResponse } from '../reports.service';
import { formatCurrencyValue } from '../utils/locale-utils';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { UiStateComponent } from '../ui-state/ui-state.component';
import { DonutChartComponent, DonutChartItem } from '../shared/donut-chart/donut-chart.component';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { TransactionSummaryCardComponent } from '../shared/transactions/transaction-summary-card.component';
import { UsageBarComponent } from '../shared/usage-bar/usage-bar.component';
import { ResponsiveListComponent, ResponsiveListColumn } from '../shared/responsive-list/responsive-list.component';
import { ResponsiveListCellDirective } from '../shared/responsive-list/responsive-list-cell.directive';
import { buildExpenseDonutItems, buildTopExpenses } from './reports-overview.model';

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [
    CommonModule,
    AppCurrencyPipe,
    UiStateComponent,
    DonutChartComponent,
    PageHeaderComponent,
    TransactionSummaryCardComponent,
    UsageBarComponent,
    ResponsiveListComponent,
    ResponsiveListCellDirective
  ],
  templateUrl: './relatorios.component.html',
  styleUrl: './relatorios.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RelatoriosComponent implements OnInit {
  // Estado por signal (A9): report/loading/error vêm de callback assíncrono (HTTP fora da zona).
  readonly report = signal<MonthlySummaryReportResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  year = new Date().getFullYear();
  month = new Date().getMonth() + 1;

  readonly months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  readonly expenseCategoryColumns: ResponsiveListColumn[] = [
    { key: 'category', label: 'Categoria' },
    { key: 'amount', label: 'Valor', align: 'end' },
    { key: 'percent', label: '% do total', align: 'end' },
    { key: 'share', label: 'Participação', widthClass: 'relatorios-share-column' }
  ];

  constructor(
    private readonly reportsService: ReportsService,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef,
    private readonly ngZone: NgZone
  ) {}

  ngOnInit(): void { this.load(); }

  get monthName(): string { return this.months[this.month - 1]; }

  get expensesDonutItems(): DonutChartItem[] {
    return buildExpenseDonutItems(this.report()?.expensesByCategory);
  }

  get topExpenses(): CategoryExpenseResponse[] {
    return buildTopExpenses(this.report()?.topExpenses);
  }

  readonly trackCategory = (cat: CategoryExpenseResponse): string => cat.categoryName;

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.reportsService.getMonthlySummary(this.year, this.month)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => this.ngZone.run(() => { this.report.set(r); this.loading.set(false); this.cdr.markForCheck(); }),
        error: () => this.ngZone.run(() => {
          this.report.set(null);
          this.error.set('Não foi possível carregar o relatório deste período.');
          this.loading.set(false);
          this.cdr.markForCheck();
        })
      });
  }

  prevMonth(): void {
    if (this.month === 1) { this.month = 12; this.year--; } else { this.month--; }
    this.load();
  }

  nextMonth(): void {
    if (this.month === 12) { this.month = 1; this.year++; } else { this.month++; }
    this.load();
  }

  exportCsv(): void {
    const report = this.report();
    if (!report) return;
    const rows = [['Categoria','Valor (R$)','% do total']];
    for (const cat of report.expensesByCategory) {
      rows.push([cat.categoryName, String(cat.amount), String(cat.percentageOfTotal)]);
    }
    const summaryRows = [
      [],
      ['Resumo'],
      ['Receitas totais', String(report.totalIncome)],
      ['Despesas totais', String(report.totalExpenses)],
      ['Saldo líquido', String(report.netBalance)],
      ['Taxa de poupança (%)', String(report.savingsRate)]
    ];
    const csv = [...rows, ...summaryRows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${this.year}-${String(this.month).padStart(2,'0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportPdf(): void {
    const report = this.report();
    if (!report) return;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Investindo em Negócios', 14, 18);
    doc.setFontSize(12);
    doc.text(`Relatório financeiro — ${this.monthName} de ${this.year}`, 14, 26);

    autoTable(doc, {
      startY: 34,
      head: [['Resumo do mês', 'Valor']],
      body: [
        ['Receitas totais', formatCurrencyValue(report.totalIncome)],
        ['Despesas totais', formatCurrencyValue(report.totalExpenses)],
        ['Saldo líquido', formatCurrencyValue(report.netBalance)],
        ['Taxa de poupança', `${report.savingsRate.toFixed(1)}%`]
      ]
    });

    const afterSummaryY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    autoTable(doc, {
      startY: afterSummaryY,
      head: [['Categoria', 'Valor', '% do total']],
      body: report.expensesByCategory.map((cat) => [
        cat.categoryName,
        formatCurrencyValue(cat.amount),
        `${cat.percentageOfTotal.toFixed(1)}%`
      ])
    });

    doc.save(`relatorio-${this.year}-${String(this.month).padStart(2, '0')}.pdf`);
  }
}
