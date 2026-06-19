import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReportsService, MonthlySummaryReportResponse } from '../reports.service';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { UiStateComponent } from '../ui-state/ui-state.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [CommonModule, AppCurrencyPipe, UiStateComponent, EmptyStateComponent],
  templateUrl: './relatorios.component.html',
  styleUrl: './relatorios.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RelatoriosComponent implements OnInit {
  report: MonthlySummaryReportResponse | null = null;
  loading = false;

  year = new Date().getFullYear();
  month = new Date().getMonth() + 1;

  readonly months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  constructor(
    private readonly reportsService: ReportsService,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void { this.load(); }

  get monthName(): string { return this.months[this.month - 1]; }

  load(): void {
    this.loading = true;
    this.reportsService.getMonthlySummary(this.year, this.month)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => { this.report = r; this.loading = false; this.cdr.markForCheck(); },
        error: () => { this.loading = false; this.cdr.markForCheck(); }
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
}
