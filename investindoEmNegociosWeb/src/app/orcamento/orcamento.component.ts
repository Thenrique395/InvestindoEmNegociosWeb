import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { BudgetService, BudgetResponse, BudgetItemResponse } from '../budget.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { UiStateComponent } from '../ui-state/ui-state.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { TransactionSummaryCardComponent } from '../shared/transactions/transaction-summary-card.component';
import { UsageBarComponent } from '../shared/usage-bar/usage-bar.component';
import { ConfirmSheetComponent } from '../shared/confirm-sheet/confirm-sheet.component';
import { extractApiErrorMessage } from '../utils/api-error.utils';
import { BudgetItemView, BudgetOverview, buildBudgetItemViews, buildBudgetOverview } from './budget-overview.model';

@Component({
  selector: 'app-orcamento',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppCurrencyPipe,
    UiStateComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    TransactionSummaryCardComponent,
    UsageBarComponent,
    ConfirmSheetComponent
  ],
  templateUrl: './orcamento.component.html',
  styleUrl: './orcamento.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrcamentoComponent implements OnInit {
  // Estado de exibição assíncrono por signal (A9). Campos ngModel (newCategory/newAmount/
  // editingAmount) e sync-only (editingId/pendingDelete) ficam plain: refletem via o CD
  // disparado pelos signals co-setados no mesmo callback.
  readonly budget = signal<BudgetResponse | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly error = signal('');

  editingId: string | null = null;
  editingAmount: number | null = null;
  pendingDelete: BudgetItemResponse | null = null;

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

  get overview(): BudgetOverview {
    return buildBudgetOverview(this.budget());
  }

  get itemViews(): BudgetItemView[] {
    return buildBudgetItemViews(this.budget());
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.budgetService.get(this.year, this.month).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (b) => { this.budget.set(b); this.loading.set(false); this.cdr.markForCheck(); },
      error: (err) => {
        this.budget.set(null);
        this.error.set(extractApiErrorMessage(err, 'Não foi possível carregar o orçamento deste período.'));
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  addItem(): void {
    if (!this.newCategory.trim() || !this.newAmount) return;
    this.saving.set(true);
    const items = [{ categoryName: this.newCategory.trim(), plannedAmount: this.newAmount }];
    this.budgetService.upsertItems(this.year, this.month, items).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (b) => {
        this.budget.set(b);
        this.newCategory = '';
        this.newAmount = null;
        this.saving.set(false);
        this.uiFeedback.success('Categoria adicionada ao orçamento.');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.saving.set(false);
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao adicionar categoria.'));
        this.cdr.markForCheck();
      }
    });
  }

  startEdit(item: BudgetItemResponse): void {
    this.editingId = item.id;
    this.editingAmount = item.plannedAmount;
    this.cdr.markForCheck();
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editingAmount = null;
    this.cdr.markForCheck();
  }

  confirmEdit(item: BudgetItemResponse): void {
    const amount = this.editingAmount;
    if (amount === null || amount < 0 || amount === item.plannedAmount) {
      this.cancelEdit();
      return;
    }
    this.budgetService.upsertItems(this.year, this.month, [{ categoryName: item.categoryName, plannedAmount: amount }])
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (b) => {
          this.budget.set(b);
          this.editingId = null;
          this.editingAmount = null;
          this.uiFeedback.success('Valor planejado atualizado.');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao atualizar valor planejado.'));
          this.cdr.markForCheck();
        }
      });
  }

  askRemove(item: BudgetItemResponse): void {
    if (this.deletingId()) return;
    this.pendingDelete = item;
    this.cdr.markForCheck();
  }

  cancelRemove(): void {
    this.pendingDelete = null;
    this.cdr.markForCheck();
  }

  confirmRemove(): void {
    const item = this.pendingDelete;
    if (!item || this.deletingId()) return;
    this.deletingId.set(item.id);
    this.pendingDelete = null;
    this.budgetService.deleteItem(item.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        const current = this.budget();
        if (current) {
          this.budget.set({ ...current, items: current.items.filter(i => i.id !== item.id) });
        }
        if (this.editingId === item.id) { this.editingId = null; this.editingAmount = null; }
        this.deletingId.set(null);
        this.uiFeedback.success('Item removido do orçamento.');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.deletingId.set(null);
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao remover item.'));
        this.cdr.markForCheck();
      }
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
    const budget = this.budget();
    if (!budget) return;
    const rows = [['Categoria','Planejado','Realizado','Variação']];
    for (const item of budget.items) {
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
