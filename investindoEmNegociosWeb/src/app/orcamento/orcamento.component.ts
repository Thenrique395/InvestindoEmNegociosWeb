import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { BudgetService, BudgetResponse, BudgetItemResponse } from '../budget.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { UiStateComponent } from '../ui-state/ui-state.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

@Component({
  selector: 'app-orcamento',
  standalone: true,
  imports: [CommonModule, FormsModule, AppCurrencyPipe, UiStateComponent, EmptyStateComponent],
  templateUrl: './orcamento.component.html',
  styleUrl: './orcamento.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrcamentoComponent implements OnInit {
  budget: BudgetResponse | null = null;
  loading = false;
  saving = false;
  deletingId: string | null = null;

  year = new Date().getFullYear();
  month = new Date().getMonth() + 1;

  newCategory = '';
  newAmount: number | null = null;

  readonly months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  constructor(
    private readonly budgetService: BudgetService,
    private readonly uiFeedback: UiFeedbackService,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void { this.load(); }

  get monthName(): string { return this.months[this.month - 1]; }

  load(): void {
    this.loading = true;
    this.budgetService.get(this.year, this.month).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (b) => { this.budget = b; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  addItem(): void {
    if (!this.newCategory.trim() || !this.newAmount) return;
    this.saving = true;
    const items = [{ categoryName: this.newCategory.trim(), plannedAmount: this.newAmount }];
    this.budgetService.upsertItems(this.year, this.month, items).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (b) => {
        this.budget = b;
        this.newCategory = '';
        this.newAmount = null;
        this.saving = false;
        this.uiFeedback.success('Categoria adicionada ao orçamento.');
        this.cdr.markForCheck();
      },
      error: () => { this.saving = false; this.cdr.markForCheck(); }
    });
  }

  updateItem(item: BudgetItemResponse, newAmount: number): void {
    this.budgetService.upsertItems(this.year, this.month, [{ categoryName: item.categoryName, plannedAmount: newAmount }])
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (b) => { this.budget = b; this.cdr.markForCheck(); },
        error: () => {}
      });
  }

  removeItem(item: BudgetItemResponse): void {
    this.deletingId = item.id;
    this.budgetService.deleteItem(item.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        if (this.budget) {
          this.budget = { ...this.budget, items: this.budget.items.filter(i => i.id !== item.id) };
        }
        this.deletingId = null;
        this.uiFeedback.success('Item removido do orçamento.');
        this.cdr.markForCheck();
      },
      error: () => { this.deletingId = null; this.cdr.markForCheck(); }
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
    if (!this.budget) return;
    const rows = [['Categoria','Planejado','Realizado','Variação']];
    for (const item of this.budget.items) {
      rows.push([item.categoryName, String(item.plannedAmount), String(item.realizedAmount), String(item.variance)]);
    }
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orcamento-${this.year}-${String(this.month).padStart(2,'0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
