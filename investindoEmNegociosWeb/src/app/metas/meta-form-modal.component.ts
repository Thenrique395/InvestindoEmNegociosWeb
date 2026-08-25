import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Goal, GoalKind, GoalMode, GoalScopeDto, GoalsService, RecurrenceType } from '../goals.service';
import { CategoriesStore } from '../categories.store';
import { CategoryDto } from '../categories.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { ModalComponent } from '../shared/modal/modal.component';
import { FormFieldComponent } from '../shared/form-field/form-field.component';
import { DatePickerComponent } from '../shared/date-picker/date-picker.component';
import { SegmentedSelectorComponent, SegmentOption } from '../shared/segmented-selector/segmented-selector.component';
import { SelectMenuComponent, SelectMenuOption } from '../shared/select-menu/select-menu.component';
import { extractApiErrorMessage } from '../utils/api-error.utils';

/**
 * Modal de meta, fechado em si mesmo. Irmão do `app-receita-form-modal`.
 *
 * Diferente de receita e despesa, aqui o modal atende criação **e** edição: a
 * meta não tem escopo de recorrência nem histórico de parcela, então editar é
 * o mesmo formulário com `[goal]` preenchido — exatamente como o
 * `app-cartao-form` faz com `[card]`. Por isso a página de Metas não guarda mais
 * uma cópia do formulário: ela usa este componente nos dois casos.
 */
@Component({
  selector: 'app-meta-form-modal',
  standalone: true,
  imports: [FormsModule, ModalComponent, FormFieldComponent, DatePickerComponent, SegmentedSelectorComponent, SelectMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="true" eyebrow="Planejamento" [title]="goal ? 'Editar meta' : 'Nova meta'" size="md" (close)="fechar()">
      <div class="metas-form" modal-body>
        <div class="metas-form__section">
          <div class="metas-form__section-head">
            <span>Objetivo</span>
            <p>Defina o tipo e o valor que será acompanhado.</p>
          </div>

          <div class="metas-form__kind">
            <span class="metas-form__label">Tipo de meta</span>
            <app-segmented-selector [options]="kindOptions" [value]="form.kind" ariaLabel="Tipo de meta" (valueChange)="setFormKind($event)" />
          </div>

          <app-form-field label="Nome"><input type="text" [(ngModel)]="form.title" placeholder="Ex.: Alimentação, Renda extra, Reserva" /></app-form-field>

          <div class="metas-form__row">
            <app-form-field [label]="form.kind === 'Expense' ? 'Limite (R$)' : form.kind === 'Income' ? 'Objetivo (R$)' : 'Meta de aporte (R$)'">
              <input type="number" inputmode="decimal" [(ngModel)]="form.targetAmount" placeholder="0,00" />
            </app-form-field>
            <app-form-field label="Recorrência">
              <app-select-menu [options]="recurrenceOptions" [(ngModel)]="form.recurrence" ariaLabel="Recorrência" />
            </app-form-field>
          </div>
        </div>

        <div class="metas-form__section">
          <div class="metas-form__section-head">
            <span>Período</span>
            <p>Use as datas para calcular ritmo, recorrência e prazo.</p>
          </div>

          <div class="metas-form__row">
            <app-form-field label="Início"><app-date-picker format="iso" [value]="form.startDate" (valueChange)="form.startDate = $event" ariaLabel="Início" /></app-form-field>
            <app-form-field label="Término"><app-date-picker format="iso" [value]="form.endDate" (valueChange)="form.endDate = $event" ariaLabel="Término" /></app-form-field>
          </div>
        </div>

        <div class="metas-form__section">
          <div class="metas-form__section-head">
            <span>Regras</span>
            <p>{{ isInvestmentForm ? 'Investimentos acompanham aportes, sem categoria de consumo.' : 'Conecte a meta a categorias e alertas de acompanhamento.' }}</p>
          </div>

          @if (!isInvestmentForm) {
            <app-form-field label="Categoria (opcional)">
              <app-select-menu [options]="categorySelectOptions" [(ngModel)]="form.categoryId" [searchable]="true" ariaLabel="Categoria da meta" />
            </app-form-field>

            <div class="metas-form__row">
              <app-form-field label="Alerta de atenção (%)"><input type="number" [(ngModel)]="form.warningThreshold" /></app-form-field>
              <app-form-field label="Alerta crítico (%)"><input type="number" [(ngModel)]="form.criticalThreshold" /></app-form-field>
            </div>
          } @else {
            <div class="metas-form__note">
              Metas de investimento acompanham aportes e evolução patrimonial. Categoria e limiares de consumo não se aplicam a este tipo.
            </div>
          }

          <app-form-field label="Descrição (opcional)"><input type="text" [(ngModel)]="form.description" /></app-form-field>
        </div>
      </div>
      <div class="metas-form__footer" modal-footer>
        <button type="button" class="btn-ghost sm" (click)="fechar()">Cancelar</button>
        <button type="button" class="btn-primary sm" (click)="salvar()" [disabled]="saving()">{{ saving() ? 'Salvando...' : (goal ? 'Salvar' : 'Criar meta') }}</button>
      </div>
    </app-modal>
  `,
  styles: `
.metas-form {
  display: grid;
  gap: 0.9rem;
}

.metas-form__section {
  display: grid;
  gap: 0.75rem;
  padding: 0.9rem;
  border: 1px solid var(--border-inner, var(--border));
  border-radius: var(--radius-inner);
  background: var(--surface-subtle);
}

.metas-form__section-head {
  display: grid;
  gap: 0.15rem;
}

.metas-form__section-head span {
  font-size: var(--fs-body, 0.9rem);
  font-weight: 800;
  color: var(--text);
}

.metas-form__section-head p {
  margin: 0;
  color: var(--text-tertiary);
  font-size: var(--fs-meta, 0.82rem);
  line-height: var(--lh-body);
}

.metas-form__kind {
  display: grid;
  gap: 0.4rem;
}

.metas-form__label {
  display: block;
  font-size: var(--fs-caption, 0.68rem);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-tertiary);
}

.metas-form__row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}

.metas-form__note {
  padding: 0.85rem 0.95rem;
  border: 1px solid color-mix(in srgb, var(--primary) 22%, transparent);
  border-radius: var(--radius-inner);
  background: var(--primary-tint-soft);
  color: var(--text-secondary);
  font-size: var(--fs-meta);
  line-height: var(--lh-body);
}

.metas-form__footer {
  display: contents;
}
  `
})
export class MetaFormModalComponent {
  /** Meta a editar. `null` cria uma nova. */
  @Input() goal: Goal | null = null;

  @Output() saved = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  readonly saving = signal(false);
  readonly categories = signal<CategoryDto[]>([]);
  form = this.emptyForm();

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
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef
  ) {}

  /**
   * O componente é montado só quando abre, então preparar o formulário no
   * `ngOnInit` basta — não há reabertura sem remontagem.
   */
  ngOnInit(): void {
    this.categoriesStore.load();
    this.categories.set(this.categoriesStore.categories());
    this.form = this.goal ? this.formFromGoal(this.goal) : this.emptyForm();
  }

  get categoryOptions(): CategoryDto[] {
    if (this.form.kind === 'Income') return this.categories().filter((c) => c.appliesTo === 'Income');
    if (this.form.kind === 'Expense') return this.categories().filter((c) => c.appliesTo === 'Expense');
    return [];
  }

  get categorySelectOptions(): SelectMenuOption[] {
    return [
      { value: '', label: `Todas as ${this.form.kind === 'Income' ? 'receitas' : 'despesas'}` },
      ...this.categoryOptions.map((category) => ({ value: category.id, label: category.name }))
    ];
  }

  get isInvestmentForm(): boolean {
    return this.form.kind === 'Investment';
  }

  setFormKind(kind: string): void {
    this.form.kind = kind as GoalKind;
    this.form.categoryId = '';
  }

  fechar(): void {
    if (this.saving()) return;
    this.close.emit();
  }

  salvar(): void {
    if (this.saving()) return;

    const title = this.form.title.trim();
    const target = Number(this.form.targetAmount);
    if (title.length < 2) {
      this.uiFeedback.warning('Informe um nome para a meta.');
      return;
    }
    if (!Number.isFinite(target) || target <= 0) {
      this.uiFeedback.warning('Informe um valor-alvo válido.');
      return;
    }

    const scopes: GoalScopeDto[] | null = this.form.categoryId
      ? [{ scopeType: 'Category', refId: this.form.categoryId }]
      : null;
    const mode: GoalMode =
      this.form.kind === 'Expense' ? 'Limit' : this.form.kind === 'Income' ? 'Target' : 'RecurringContribution';
    const year = this.form.startDate ? new Date(this.form.startDate).getFullYear() : new Date().getFullYear();

    const payload = {
      title,
      targetAmount: target,
      currentAmount: 0,
      year,
      description: this.form.description.trim() || null,
      // 'InProgress' vale no backend novo e no antigo; a criação ignora o status.
      // Na edição, preserva o que a meta já tinha.
      status: this.goal?.status ?? 'InProgress',
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

    this.saving.set(true);
    const op = this.goal ? this.goalsService.update(this.goal.id, payload) : this.goalsService.create(payload);

    op.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.uiFeedback.success(this.goal ? 'Meta atualizada.' : 'Meta criada.');
        this.saved.emit();
        this.close.emit();
      },
      error: (err) => {
        this.saving.set(false);
        this.uiFeedback.error(extractApiErrorMessage(err, 'Não foi possível salvar a meta.'));
        this.cdr.markForCheck();
      }
    });
  }

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

  private formFromGoal(goal: Goal) {
    const base = this.emptyForm();
    return {
      kind: (goal.kind === 'General' ? 'Expense' : goal.kind) as GoalKind,
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
  }
}
