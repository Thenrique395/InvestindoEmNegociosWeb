import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CategoriesService, CategoryDto, CategoryType } from '../categories.service';
import { AdminCategoriesService, AdminCategory } from '../admin-categories.service';
import { AuthService } from '../auth.service';
import { hasAtLeastRole } from '../roles';
import { UiFeedbackService } from '../ui-feedback.service';
import { CategoriesStore } from '../categories.store';
import { FormState } from '../utils/form-state';
import { FormFieldComponent } from '../shared/form-field/form-field.component';
import { ModalComponent } from '../shared/modal/modal.component';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { TransactionSummaryCardComponent } from '../shared/transactions/transaction-summary-card.component';
import { SegmentedSelectorComponent, SegmentOption } from '../shared/segmented-selector/segmented-selector.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { CategoryListComponent } from './category-list.component';
import {
  buildCategoryViews,
  buildOverview,
  CategoriesFilters,
  CategoriesOverview,
  CategoryTab,
  CategoryView,
  filterCategories,
  sortByName
} from './categories-overview.model';

type CategoryFormField = 'name' | 'scope' | 'type';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [
    FormsModule,
    FormFieldComponent,
    ModalComponent,
    PageHeaderComponent,
    TransactionSummaryCardComponent,
    SegmentedSelectorComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    CategoryListComponent
  ],
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriesComponent implements OnInit {
  // A9/A21: derivação por signal/computed (sem effect copiando signal → campo).
  // As categorias e o loading vêm dos signals do store; categoryViews/overview derivam
  // deles + adminCategories. Campos ngModel/sync-only ficam plain.
  readonly adminCategories = signal<AdminCategory[]>([]);
  readonly loading = computed(() => this.categoriesStore.loading());
  readonly categoryViews = computed<CategoryView[]>(() => {
    const categorias = this.categoriesStore.categories();
    let source: CategoryDto[];
    if (this.isAdmin) {
      const system: CategoryDto[] = this.adminCategories().map((a) => ({
        id: a.id,
        name: a.name,
        appliesTo: a.appliesTo === 'Income' || a.appliesTo === 'Expense' ? a.appliesTo : null,
        isDefault: true,
        isActive: a.isActive
      }));
      const personal = categorias.filter((c) => !c.isDefault);
      source = [...system, ...personal];
    } else {
      source = categorias;
    }
    return sortByName(buildCategoryViews(source));
  });
  readonly overview = computed<CategoriesOverview>(() => buildOverview(this.categoryViews()));

  filters: CategoriesFilters = { search: '', tab: 'all', origin: 'all', status: 'all' };

  nome = '';
  tipo: CategoryType = 'Expense';
  escopo: 'user' | 'default' = 'user';
  readonly showModal = signal(false);
  readonly saving = signal(false);
  isAdmin = false;

  readonly adminLoading = signal(false);
  readonly adminSaving = signal(false);
  readonly showAdminModal = signal(false);
  adminEditing: AdminCategory | null = null;
  adminName = '';
  adminAppliesTo: '' | CategoryType = '';
  deleteTarget: CategoryView | null = null;

  readonly tipos = [
    { id: 'Expense' as CategoryType, label: 'Despesa' },
    { id: 'Income' as CategoryType, label: 'Receita' }
  ];

  readonly categoryForm = new FormState<CategoryFormField>(
    ['name', 'scope', 'type'],
    () => this.validateCategoryForm()
  );

  constructor(
    private readonly categoriesStore: CategoriesStore,
    private readonly categoriesService: CategoriesService,
    private readonly adminCategoriesService: AdminCategoriesService,
    private readonly authService: AuthService,
    private readonly uiFeedback: UiFeedbackService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isAdmin = hasAtLeastRole(this.authService.getRole(), 'Admin');
    this.categoriesStore.load();
    if (this.isAdmin) this.loadAdmin();
  }

  get tabOptions(): SegmentOption[] {
    return [
      { value: 'all', label: 'Todas' },
      { value: 'Expense', label: 'Despesas' },
      { value: 'Income', label: 'Receitas' }
    ];
  }

  get filteredViews(): CategoryView[] {
    return filterCategories(this.categoryViews(), this.filters);
  }

  get busy(): boolean {
    return (this.loading() || this.adminLoading()) && !this.categoryViews().length;
  }

  setTab(tab: string): void {
    this.filters = { ...this.filters, tab: tab as CategoryTab };
    this.cdr.markForCheck();
  }

  onFilterChange(): void {
    this.cdr.markForCheck();
  }

  loadAdmin(): void {
    this.adminLoading.set(true);
    this.adminCategoriesService.list(true).subscribe({
      next: (data) => { this.adminCategories.set(data); },
      error: () => { this.uiFeedback.error('Não foi possível carregar as categorias de sistema.'); this.adminLoading.set(false); this.cdr.markForCheck(); },
      complete: () => { this.adminLoading.set(false); this.cdr.markForCheck(); }
    });
  }

  /** Atualização imutável do status de uma categoria de sistema (dispara o computed). */
  private setAdminActive(id: string, active: boolean): void {
    this.adminCategories.set(this.adminCategories().map((c) => c.id === id ? { ...c, isActive: active } : c));
  }

  // ---- Criar (usuário: pessoal / admin: pode escolher sistema) ---------------

  abrirModal(): void {
    this.showModal.set(true);
    this.resetCategoryForm();
  }

  fecharModal(): void {
    if (this.saving()) return;
    this.showModal.set(false);
  }

  adicionar(): void {
    this.categoryForm.submit();
    if (!this.categoryForm.isValid()) {
      this.uiFeedback.warning('Revise os campos destacados antes de salvar.');
      return;
    }

    const nomeLimpo = this.nome.trim();
    const conflito = this.findConflict(nomeLimpo, this.tipo, this.escopo);
    if (conflito === 'default') { this.uiFeedback.info('Essa categoria já existe no sistema.'); return; }
    if (conflito === 'user') { this.uiFeedback.warning('Você já tem uma categoria com esse nome e tipo.'); return; }
    if (conflito === 'admin') { this.uiFeedback.warning('Já existe uma categoria de sistema com esse nome e tipo.'); return; }

    this.saving.set(true);

    if (this.isAdmin && this.escopo === 'default') {
      this.adminCategoriesService.create({ name: nomeLimpo, appliesTo: this.tipo }).subscribe({
        next: () => {
          this.resetCategoryForm();
          this.showModal.set(false);
          this.loadAdmin();
          this.categoriesService.invalidateCache();
          this.categoriesStore.refresh();
          this.uiFeedback.success('Categoria de sistema criada com sucesso.');
        },
        error: () => { this.uiFeedback.error('Erro ao criar categoria de sistema.'); this.saving.set(false); this.cdr.markForCheck(); },
        complete: () => { this.saving.set(false); this.cdr.markForCheck(); }
      });
      return;
    }

    this.categoriesService.create({ name: nomeLimpo, appliesTo: this.tipo }).subscribe({
      next: () => {
        this.categoriesStore.refresh();
        this.resetCategoryForm();
        this.showModal.set(false);
        this.uiFeedback.success('Categoria criada com sucesso.');
      },
      error: (err) => { this.uiFeedback.error(err?.error ?? 'Erro ao criar categoria.'); this.saving.set(false); this.cdr.markForCheck(); },
      complete: () => { this.saving.set(false); this.cdr.markForCheck(); }
    });
  }

  // ---- Editar / ativar-desativar (admin, categorias de sistema) --------------

  onEditView(view: CategoryView): void {
    if (!this.isAdmin || view.origin !== 'default') return;
    const admin = this.adminCategories().find((c) => c.id === view.category.id);
    if (!admin) return;
    this.adminEditing = admin;
    this.adminName = admin.name;
    this.adminAppliesTo = (admin.appliesTo as CategoryType) || '';
    this.showAdminModal.set(true);
  }

  onToggleView(view: CategoryView): void {
    if (!this.isAdmin || view.origin !== 'default' || this.adminSaving()) return;
    const admin = this.adminCategories().find((c) => c.id === view.category.id);
    if (!admin) return;
    const next = !admin.isActive;
    this.adminSaving.set(true);
    this.setAdminActive(admin.id, next); // otimista
    this.adminCategoriesService.updateStatus(admin.id, next).subscribe({
      next: (updated) => { this.setAdminActive(admin.id, updated.isActive); this.categoriesService.invalidateCache(); this.categoriesStore.refresh(); },
      error: () => { this.setAdminActive(admin.id, !next); this.uiFeedback.error('Não foi possível atualizar o status.'); },
      complete: () => { this.adminSaving.set(false); this.cdr.markForCheck(); }
    });
  }

  closeAdminModal(): void {
    if (this.adminSaving()) return;
    this.showAdminModal.set(false);
    this.adminEditing = null;
  }

  saveAdmin(): void {
    if (!this.adminEditing || !this.adminName.trim()) {
      this.uiFeedback.warning('Informe o nome da categoria.');
      return;
    }
    this.adminSaving.set(true);
    this.adminCategoriesService.update(this.adminEditing.id, { name: this.adminName.trim(), appliesTo: this.adminAppliesTo || null }).subscribe({
      next: () => {
        this.showAdminModal.set(false);
        this.adminEditing = null;
        this.loadAdmin();
        this.categoriesService.invalidateCache();
        this.categoriesStore.refresh();
      },
      error: () => { this.uiFeedback.error('Não foi possível salvar a categoria de sistema.'); this.adminSaving.set(false); this.cdr.markForCheck(); },
      complete: () => { this.adminSaving.set(false); this.cdr.markForCheck(); }
    });
  }

  // ---- Excluir (categorias personalizadas) ----------------------------------

  remover(view: CategoryView): void {
    if (view.origin !== 'custom') return;
    this.deleteTarget = view;
  }

  cancelarRemocao(): void {
    this.deleteTarget = null;
  }

  confirmarRemocao(): void {
    const view = this.deleteTarget;
    if (!view) return;
    this.deleteTarget = null;

    this.categoriesService.delete(view.category.id).subscribe({
      next: () => { this.categoriesStore.refresh(); this.uiFeedback.success('Categoria removida com sucesso.'); },
      error: (err) => this.uiFeedback.error(err?.error ?? 'Não foi possível remover a categoria.')
    });
  }

  // ---- Form helpers ---------------------------------------------------------

  private validateCategoryForm(): Partial<Record<CategoryFormField, string>> {
    const errors: Partial<Record<CategoryFormField, string>> = {};
    const nomeLimpo = this.nome.trim();
    if (!nomeLimpo) errors.name = 'Informe o nome da categoria.';
    else if (nomeLimpo.length < 2) errors.name = 'O nome precisa ter pelo menos 2 caracteres.';
    if (!this.tipo) errors.type = 'Selecione o tipo da categoria.';
    if (this.isAdmin && !this.escopo) errors.scope = 'Selecione o escopo da categoria.';
    return errors;
  }

  private resetCategoryForm(): void {
    this.nome = '';
    this.tipo = 'Expense';
    this.escopo = 'user';
    this.categoryForm.reset();
  }

  private findConflict(name: string, type: CategoryType, scope: 'user' | 'default'): 'default' | 'user' | 'admin' | null {
    const normalizedName = this.normalizeText(name);
    const sameName = (value: string) => this.normalizeText(value) === normalizedName;

    if (scope === 'default') {
      const existsInAdmin = this.adminCategories().some((c) => sameName(c.name) && (c.appliesTo === type || c.appliesTo == null));
      return existsInAdmin ? 'admin' : null;
    }

    const categorias = this.categoriesStore.categories();
    const duplicateDefault = categorias.some((c) => c.isDefault && c.appliesTo === type && sameName(c.name));
    if (duplicateDefault) return 'default';
    const duplicateUser = categorias.some((c) => !c.isDefault && c.appliesTo === type && sameName(c.name));
    if (duplicateUser) return 'user';
    return null;
  }

  private normalizeText(value: string): string {
    return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
  }
}
