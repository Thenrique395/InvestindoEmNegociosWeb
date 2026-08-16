import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { BudgetService, BudgetResponse, BudgetItemResponse } from '../budget.service';
import { CategoriesService, CategoryDto } from '../categories.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { ProgressBarComponent } from '../shared/progress-bar/progress-bar.component';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { UiStateComponent } from '../ui-state/ui-state.component';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { TransactionSummaryCardComponent } from '../shared/transactions/transaction-summary-card.component';
import { ConfirmSheetComponent } from '../shared/confirm-sheet/confirm-sheet.component';
import { ResponsiveListComponent, ResponsiveListColumn } from '../shared/responsive-list/responsive-list.component';
import { ResponsiveListCellDirective } from '../shared/responsive-list/responsive-list-cell.directive';
import { SegmentedSelectorComponent, SegmentOption } from '../shared/segmented-selector/segmented-selector.component';
import { DonutChartComponent, DonutChartItem } from '../shared/donut-chart/donut-chart.component';
import { ModalComponent } from '../shared/modal/modal.component';
import { SelectMenuComponent, SelectMenuOption } from '../shared/select-menu/select-menu.component';
import { extractApiErrorMessage } from '../utils/api-error.utils';
import { BudgetFilter, BudgetItemView, BudgetListTotals, BudgetOverrun, BudgetOverview, BudgetPace, buildBudgetComposition, buildBudgetItemViews, buildBudgetListTotals, buildBudgetOverruns, buildBudgetOverview, buildBudgetPace, filterBudgetItemViews , budgetUsageCardTone } from './budget-overview.model';

@Component({
  selector: 'app-orcamento',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppCurrencyPipe,
    UiStateComponent,
    PageHeaderComponent,
    TransactionSummaryCardComponent,
    ProgressBarComponent,
    ConfirmSheetComponent,
    ResponsiveListComponent,
    ResponsiveListCellDirective,
    SegmentedSelectorComponent,
    DonutChartComponent,
    ModalComponent,
    SelectMenuComponent
  ],
  templateUrl: './orcamento.component.html',
  styleUrl: './orcamento.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrcamentoComponent implements OnInit {
  /** Tom do card 'Uso do orçamento' — limiar do primitivo, não do template. */
  readonly usageCardTone = budgetUsageCardTone;

  // Estado de exibição assíncrono por signal (A9). Campos ngModel (newCategory/newAmount/
  // editingAmount) e sync-only (editingId/pendingDelete) ficam plain: refletem via o CD
  // disparado pelos signals co-setados no mesmo callback.
  readonly budget = signal<BudgetResponse | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly copyingPrevious = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly error = signal('');
  readonly filter = signal<BudgetFilter>('all');
  readonly showAddModal = signal(false);
  readonly categories = signal<CategoryDto[]>([]);
  readonly categoriesLoading = signal(false);

  editingId: string | null = null;
  editingAmount: number | null = null;
  pendingDelete: BudgetItemResponse | null = null;

  year = new Date().getFullYear();
  month = new Date().getMonth() + 1;

  newCategory = '';
  newAmount: number | null = null;
  selectedCategoryId = '';

  readonly months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  readonly categoryColumns: ResponsiveListColumn[] = [
    { key: 'category', label: 'Categoria' },
    { key: 'planned', label: 'Planejado', align: 'end' },
    { key: 'realized', label: 'Realizado', align: 'end' },
    { key: 'variance', label: 'Variação', align: 'end' },
    { key: 'usage', label: 'Uso', widthClass: 'orcamento-usage-column' },
    { key: 'actions', label: 'Ações', align: 'end' }
  ];

  readonly filterOptions: SegmentOption[] = [
    { value: 'all', label: 'Todas' },
    { value: 'attention', label: 'Em atenção' },
    { value: 'overBudget', label: 'Estouradas' }
  ];

  constructor(
    private readonly budgetService: BudgetService,
    private readonly categoriesService: CategoriesService,
    private readonly uiFeedback: UiFeedbackService,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadCategories();
  }

  get monthName(): string { return this.months[this.month - 1]; }

  get overview(): BudgetOverview {
    return buildBudgetOverview(this.budget());
  }

  get itemViews(): BudgetItemView[] {
    return buildBudgetItemViews(this.budget());
  }

  get filteredItemViews(): BudgetItemView[] {
    return filterBudgetItemViews(this.itemViews, this.filter());
  }

  get filteredTotals(): BudgetListTotals {
    return buildBudgetListTotals(this.filteredItemViews);
  }

  get pace(): BudgetPace {
    return buildBudgetPace(this.budget());
  }

  get compositionItems(): DonutChartItem[] {
    return buildBudgetComposition(this.itemViews);
  }

  get overrunItems(): BudgetOverrun[] {
    return buildBudgetOverruns(this.itemViews);
  }

  get categoryOptions(): SelectMenuOption[] {
    return this.categories().map((category, index) => ({
      value: category.id,
      label: category.name,
      meta: 'Sem histórico',
      color: `var(--chart-${(index % 7) + 1})`
    }));
  }

  get selectedCategory(): CategoryDto | null {
    return this.categories().find((category) => category.id === this.selectedCategoryId) ?? null;
  }

  get addPreviewTotal(): number {
    return this.overview.totalPlanned + Number(this.newAmount || 0);
  }

  get filterCountLabel(): string {
    const count = this.filteredItemViews.length;
    return `${count} ${count === 1 ? 'categoria' : 'categorias'} neste filtro`;
  }

  readonly trackBudgetItem = (view: BudgetItemView): string => view.item.id;

  setFilter(filter: string): void {
    this.filter.set(filter as BudgetFilter);
  }

  openAddModal(): void {
    if (!this.selectedCategoryId && this.categories().length) {
      this.selectedCategoryId = this.categories()[0].id;
      this.newCategory = this.categories()[0].name;
    }
    this.showAddModal.set(true);
    if (!this.categories().length && !this.categoriesLoading()) {
      this.loadCategories();
    }
  }

  closeAddModal(): void {
    if (this.saving()) return;
    this.showAddModal.set(false);
  }

  onCategoryChange(categoryId: string): void {
    this.selectedCategoryId = categoryId;
    this.newCategory = this.selectedCategory?.name ?? '';
  }

  copyPreviousMonth(): void {
    if (this.copyingPrevious()) return;
    const previous = this.previousPeriod();
    this.copyingPrevious.set(true);
    this.budgetService.get(previous.year, previous.month).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (previousBudget) => {
        const items = (previousBudget.items || [])
          .filter((item) => item.categoryName.trim() && Number(item.plannedAmount || 0) > 0)
          .map((item) => ({ categoryName: item.categoryName, plannedAmount: Number(item.plannedAmount || 0) }));

        if (!items.length) {
          this.copyingPrevious.set(false);
          this.uiFeedback.info('O mês anterior não possui categorias planejadas para copiar.');
          this.cdr.markForCheck();
          return;
        }

        this.budgetService.upsertItems(this.year, this.month, items).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (budget) => {
            this.budget.set(budget);
            this.copyingPrevious.set(false);
            this.uiFeedback.success('Orçamento do mês anterior copiado.');
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.copyingPrevious.set(false);
            this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao copiar orçamento do mês anterior.'));
            this.cdr.markForCheck();
          }
        });
      },
      error: (err) => {
        this.copyingPrevious.set(false);
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao carregar o orçamento do mês anterior.'));
        this.cdr.markForCheck();
      }
    });
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

  loadCategories(): void {
    this.categoriesLoading.set(true);
    this.categoriesService.list('Expense').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (categories) => {
        const active = (categories || []).filter((category) => category.isActive !== false);
        this.categories.set(active);
        if (!this.selectedCategoryId && active.length) {
          this.selectedCategoryId = active[0].id;
          this.newCategory = active[0].name;
        }
        this.categoriesLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.categories.set([]);
        this.categoriesLoading.set(false);
        this.uiFeedback.error('Não foi possível carregar as categorias de despesa.');
        this.cdr.markForCheck();
      }
    });
  }

  addItem(): void {
    const categoryName = (this.selectedCategory?.name || this.newCategory).trim();
    if (!categoryName || !this.newAmount) return;
    this.saving.set(true);
    const items = [{ categoryName, plannedAmount: this.newAmount }];
    this.budgetService.upsertItems(this.year, this.month, items).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (b) => {
        this.budget.set(b);
        this.newCategory = '';
        this.selectedCategoryId = '';
        this.newAmount = null;
        this.showAddModal.set(false);
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

  private previousPeriod(): { year: number; month: number } {
    return this.month === 1
      ? { year: this.year - 1, month: 12 }
      : { year: this.year, month: this.month - 1 };
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
