import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import {
  Goal, GoalKind, GoalMode, GoalOccurrence, GoalProgress, GoalScopeDto, GoalsService, RecurrenceType
} from '../goals.service';
import { CategoriesStore } from '../categories.store';
import { CategoryDto } from '../categories.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { TransactionSummaryCardComponent } from '../shared/transactions/transaction-summary-card.component';
import { SegmentedSelectorComponent, SegmentOption } from '../shared/segmented-selector/segmented-selector.component';
import { ModalComponent } from '../shared/modal/modal.component';
import { FormFieldComponent } from '../shared/form-field/form-field.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { GoalCardComponent } from './goal-card.component';
import { buildGoalsSummary, buildGoalView, filterGoals, GoalsSummary, GoalTab, GoalView } from './goal-view.model';

@Component({
  selector: 'app-metas',
  standalone: true,
  imports: [
    FormsModule,
    PageHeaderComponent,
    TransactionSummaryCardComponent,
    SegmentedSelectorComponent,
    ModalComponent,
    FormFieldComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    AppCurrencyPipe,
    GoalCardComponent
  ],
  templateUrl: './metas.component.html',
  styleUrls: ['./metas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetasComponent implements OnInit {
  loading = false;
  goals: Goal[] = [];
  private progressMap: Record<string, GoalProgress> = {};
  views: GoalView[] = [];
  filtered: GoalView[] = [];
  summary: GoalsSummary = { total: 0, active: 0, achieved: 0, attention: 0, avgProgress: 0 };
  tab: GoalTab = 'all';

  categories: CategoryDto[] = [];

  // Modal criar/editar
  showForm = false;
  saving = false;
  editingId: string | null = null;
  private editingGoalRef: Goal | null = null;
  form = this.emptyForm();

  // Aporte (investimento)
  showContribute = false;
  contributing = false;
  contributeGoal?: Goal;
  contributeAmount = '';
  contributeDate = new Date().toISOString().slice(0, 10);
  contributeNote = '';

  // Detalhes
  showDetails = false;
  detailsGoal?: Goal;
  detailsProgress?: GoalProgress | null;
  detailsOccurrences: GoalOccurrence[] = [];

  // Exclusão
  deleteTarget: Goal | null = null;

  readonly kindOptions: SegmentOption[] = [
    { value: 'Expense', label: 'Despesa', icon: '📉' },
    { value: 'Income', label: 'Receita', icon: '📈' },
    { value: 'Investment', label: 'Investimento', icon: '🎯' }
  ];

  readonly recurrenceOptions: { value: RecurrenceType; label: string }[] = [
    { value: 'None', label: 'Período único' },
    { value: 'Monthly', label: 'Mensal' },
    { value: 'Quarterly', label: 'Trimestral' },
    { value: 'Semiannual', label: 'Semestral' },
    { value: 'Annual', label: 'Anual' }
  ];

  constructor(
    private readonly goalsService: GoalsService,
    private readonly categoriesStore: CategoriesStore,
    private readonly uiFeedback: UiFeedbackService,
    private readonly destroyRef: DestroyRef,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.categoriesStore.load();
    this.categories = this.categoriesStore.categories();
    this.loadGoals();
  }

  get tabOptions(): SegmentOption[] {
    return [
      { value: 'all', label: 'Todas' },
      { value: 'Expense', label: 'Despesas' },
      { value: 'Income', label: 'Receitas' },
      { value: 'Investment', label: 'Investimentos' },
      { value: 'completed', label: 'Concluídas' },
      { value: 'archived', label: 'Arquivadas' }
    ];
  }

  get categoryOptions(): CategoryDto[] {
    if (this.form.kind === 'Income') return this.categories.filter((c) => c.appliesTo === 'Income');
    if (this.form.kind === 'Expense') return this.categories.filter((c) => c.appliesTo === 'Expense');
    return [];
  }

  get isInvestmentForm(): boolean {
    return this.form.kind === 'Investment';
  }

  setTab(tab: string): void {
    this.tab = tab as GoalTab;
    this.filtered = filterGoals(this.views, this.tab);
    this.cdr.markForCheck();
  }

  loadGoals(): void {
    this.loading = true;
    this.goalsService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (goals) => {
        this.goals = goals || [];
        if (!this.goals.length) { this.loading = false; this.rebuild(); return; }
        forkJoin(this.goals.map((g) => this.goalsService.getProgress(g.id).pipe(catchError(() => of(null)))))
          .subscribe((progresses) => {
            this.progressMap = {};
            this.goals.forEach((g, i) => { if (progresses[i]) this.progressMap[g.id] = progresses[i]!; });
            this.loading = false;
            this.rebuild();
          });
      },
      error: () => { this.loading = false; this.uiFeedback.error('Não foi possível carregar as metas.'); this.cdr.markForCheck(); }
    });
  }

  private rebuild(): void {
    this.categories = this.categoriesStore.categories();
    this.views = this.goals.map((g) => buildGoalView(g, this.progressMap[g.id]));
    this.summary = buildGoalsSummary(this.views);
    this.filtered = filterGoals(this.views, this.tab);
    this.cdr.markForCheck();
  }

  // ---- Criar / editar -----------------------------------------------------

  private emptyForm() {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
    return {
      kind: 'Expense' as GoalKind,
      title: '',
      targetAmount: '',
      description: '',
      startDate: start,
      endDate: end,
      recurrence: 'Monthly' as RecurrenceType,
      warningThreshold: '80',
      criticalThreshold: '100',
      categoryId: '' as string
    };
  }

  openCreate(): void {
    this.editingId = null;
    this.editingGoalRef = null;
    this.form = this.emptyForm();
    this.showForm = true;
  }

  openEdit(goal: Goal): void {
    const base = this.emptyForm();
    this.editingId = goal.id;
    this.editingGoalRef = goal;
    this.form = {
      kind: goal.kind === 'General' ? 'Expense' : goal.kind,
      title: goal.title,
      targetAmount: String(goal.targetAmount ?? ''),
      description: goal.description ?? '',
      startDate: (goal.startDate ?? '').slice(0, 10) || base.startDate,
      endDate: (goal.endDate ?? goal.targetDate ?? '').slice(0, 10) || base.endDate,
      recurrence: goal.recurrence ?? 'None',
      warningThreshold: goal.warningThreshold != null ? String(goal.warningThreshold) : '80',
      criticalThreshold: goal.criticalThreshold != null ? String(goal.criticalThreshold) : '100',
      categoryId: goal.scopes?.find((s) => s.scopeType === 'Category')?.refId ?? ''
    };
    this.showForm = true;
  }

  setFormKind(kind: string): void {
    this.form.kind = kind as GoalKind;
    this.form.categoryId = '';
  }

  closeForm(): void {
    if (this.saving) return;
    this.showForm = false;
  }

  save(): void {
    const title = this.form.title.trim();
    const target = Number(this.form.targetAmount);
    if (title.length < 2) { this.uiFeedback.warning('Informe um nome para a meta.'); return; }
    if (!Number.isFinite(target) || target <= 0) { this.uiFeedback.warning('Informe um valor-alvo válido.'); return; }

    const scopes: GoalScopeDto[] | null = this.form.categoryId
      ? [{ scopeType: 'Category', refId: this.form.categoryId }]
      : null;
    const mode: GoalMode = this.form.kind === 'Expense' ? 'Limit' : this.form.kind === 'Income' ? 'Target' : 'RecurringContribution';
    const year = this.form.startDate ? new Date(this.form.startDate).getFullYear() : new Date().getFullYear();

    const payload = {
      title,
      targetAmount: target,
      currentAmount: 0,
      year,
      description: this.form.description.trim() || null,
      // 'InProgress' é válido no backend novo e no antigo (compat); o backend
      // ignora o status na criação. Ao editar, preserva o status atual.
      status: this.editingGoalRef?.status ?? 'InProgress',
      expectedMonthly: 0,
      targetDate: this.form.endDate || null,
      kind: this.form.kind,
      mode,
      startDate: this.form.startDate || null,
      endDate: this.form.endDate || null,
      recurrence: this.form.recurrence,
      warningThreshold: this.form.warningThreshold ? Number(this.form.warningThreshold) : null,
      criticalThreshold: this.form.criticalThreshold ? Number(this.form.criticalThreshold) : null,
      scopes
    };

    this.saving = true;
    const op = this.editingId
      ? this.goalsService.update(this.editingId, payload)
      : this.goalsService.create(payload);

    op.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.uiFeedback.success(this.editingId ? 'Meta atualizada.' : 'Meta criada.');
        this.loadGoals();
      },
      error: (err) => { this.saving = false; this.uiFeedback.error(err?.error ?? 'Não foi possível salvar a meta.'); this.cdr.markForCheck(); }
    });
  }

  // ---- Aporte (investimento) ---------------------------------------------

  openContribute(goal: Goal): void {
    this.contributeGoal = goal;
    this.contributeAmount = '';
    this.contributeDate = new Date().toISOString().slice(0, 10);
    this.contributeNote = '';
    this.showContribute = true;
  }

  closeContribute(): void { if (!this.contributing) this.showContribute = false; }

  saveContribution(): void {
    const goal = this.contributeGoal;
    const amount = Number(this.contributeAmount);
    if (!goal || !Number.isFinite(amount) || amount <= 0) { this.uiFeedback.warning('Informe um valor de aporte válido.'); return; }
    this.contributing = true;
    this.goalsService.addContribution(goal.id, { amount, date: this.contributeDate, note: this.contributeNote.trim() || null }).subscribe({
      next: () => { this.contributing = false; this.showContribute = false; this.uiFeedback.success('Aporte registrado.'); this.loadGoals(); },
      error: () => { this.contributing = false; this.uiFeedback.error('Não foi possível registrar o aporte.'); this.cdr.markForCheck(); }
    });
  }

  // ---- Detalhes / histórico ----------------------------------------------

  openDetails(goal: Goal): void {
    this.detailsGoal = goal;
    this.detailsProgress = this.progressMap[goal.id] ?? null;
    this.detailsOccurrences = [];
    this.showDetails = true;
    this.goalsService.getOccurrences(goal.id).pipe(catchError(() => of([] as GoalOccurrence[]))).subscribe((occ) => {
      this.detailsOccurrences = occ;
      this.cdr.markForCheck();
    });
  }

  closeDetails(): void { this.showDetails = false; }

  get detailsView(): GoalView | null {
    return this.detailsGoal ? buildGoalView(this.detailsGoal, this.detailsProgress) : null;
  }

  // ---- Ciclo de vida ------------------------------------------------------

  pause(goal: Goal) { this.lifecycle(this.goalsService.pause(goal.id), 'Meta pausada.'); }
  resume(goal: Goal) { this.lifecycle(this.goalsService.resume(goal.id), 'Meta reativada.'); }
  archive(goal: Goal) { this.lifecycle(this.goalsService.archive(goal.id), 'Meta arquivada.'); }
  complete(goal: Goal) { this.lifecycle(this.goalsService.complete(goal.id), 'Meta concluída.'); }

  private lifecycle(op: ReturnType<GoalsService['pause']>, success: string): void {
    op.subscribe({
      next: () => { this.uiFeedback.success(success); this.loadGoals(); },
      error: () => this.uiFeedback.error('Ação indisponível no momento.')
    });
  }

  // ---- Exclusão -----------------------------------------------------------

  askRemove(goal: Goal): void { this.deleteTarget = goal; }
  cancelRemove(): void { this.deleteTarget = null; }
  confirmRemove(): void {
    const goal = this.deleteTarget;
    if (!goal) return;
    this.deleteTarget = null;
    this.goalsService.delete(goal.id).subscribe({
      next: () => { this.uiFeedback.success('Meta excluída.'); this.loadGoals(); },
      error: () => this.uiFeedback.error('Não foi possível excluir a meta.')
    });
  }
}
