import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, NgZone, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReportsService, CategoryExpenseResponse, MonthlySummaryReportResponse } from '../reports.service';
import { formatCurrencyValue } from '../utils/locale-utils';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { UiStateComponent } from '../ui-state/ui-state.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { DonutChartComponent, DonutChartItem } from '../shared/donut-chart/donut-chart.component';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { TransactionSummaryCardComponent } from '../shared/transactions/transaction-summary-card.component';
import { UsageBarComponent } from '../shared/usage-bar/usage-bar.component';
import { buildExpenseDonutItems, buildTopExpenses } from './reports-overview.model';

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [
    CommonModule,
    AppCurrencyPipe,
    UiStateComponent,
    EmptyStateComponent,
    DonutChartComponent,
    PageHeaderComponent,
    TransactionSummaryCardComponent,
    UsageBarComponent
  ],
  templateUrl: './relatorios.component.html',
  styleUrl: './relatorios.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RelatoriosComponent implements OnInit {
  report: MonthlySummaryReportResponse | null = null;
  loading = false;
  error = '';

  year = new Date().getFullYear();
  month = new Date().getMonth() + 1;

  readonly months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  constructor(
    private readonly reportsService: ReportsService,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef,
    private readonly ngZone: NgZone
  ) {}

  ngOnInit(): void { this.load(); }

  get monthName(): string { return this.months[this.month - 1]; }

  get expensesDonutItems(): DonutChartItem[] {
    return buildExpenseDonutItems(this.report?.expensesByCategory);
  }

  get topExpenses(): CategoryExpenseResponse[] {
    return buildTopExpenses(this.report?.topExpenses);
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.reportsService.getMonthlySummary(this.year, this.month)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => this.ngZone.run(() => { this.report = r; this.loading = false; this.cdr.markForCheck(); }),
        error: () => this.ngZone.run(() => {
          this.report = null;
          this.error = 'Não foi possível carregar o relatório deste período.';
          this.loading = false;
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
    if (!this.report) return;
    const rows = [['Categoria','Valor (R$)','% do total']];
    for (const cat of this.report.expensesByCategory) {
      rows.push([cat.categoryName, String(cat.amount), String(cat.percentageOfTotal)]);
    }
    const summaryRows = [
      [],
      ['Resumo'],
      ['Receitas totais', String(this.report.totalIncome)],
      ['Despesas totais', String(this.report.totalExpenses)],
      ['Saldo líquido', String(this.report.netBalance)],
      ['Taxa de poupança (%)', String(this.report.savingsRate)]
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
    if (!this.report) return;
    const report = this.report;
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
