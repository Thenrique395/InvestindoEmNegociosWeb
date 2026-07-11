import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, effect } from '@angular/core';
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
  categorias: CategoryDto[] = [];
  categoryViews: CategoryView[] = [];
  overview: CategoriesOverview = { total: 0, activeCount: 0, expenseCount: 0, incomeCount: 0, customCount: 0 };

  filters: CategoriesFilters = { search: '', tab: 'all', origin: 'all', status: 'all' };

  nome = '';
  tipo: CategoryType = 'Expense';
  escopo: 'user' | 'default' = 'user';
  showModal = false;
  loading = false;
  saving = false;
  isAdmin = false;

  adminCategories: AdminCategory[] = [];
  adminLoading = false;
  adminSaving = false;
  showAdminModal = false;
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
  ) {
    effect(() => {
      this.categorias = this.categoriesStore.categories();
      this.loading = this.categoriesStore.loading();
      this.buildViews();
    });
  }

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
    return filterCategories(this.categoryViews, this.filters);
  }

  get busy(): boolean {
    return (this.loading || this.adminLoading) && !this.categoryViews.length;
  }

  setTab(tab: string): void {
    this.filters = { ...this.filters, tab: tab as CategoryTab };
    this.cdr.markForCheck();
  }

  onFilterChange(): void {
    this.cdr.markForCheck();
  }

  /** Fonte unificada: admin vê as categorias de sistema (com inativas) + as suas; usuário vê as próprias + padrão ativas. */
  private buildViews(): void {
    let source: CategoryDto[];
    if (this.isAdmin) {
      const system: CategoryDto[] = this.adminCategories.map((a) => ({
        id: a.id,
        name: a.name,
        appliesTo: a.appliesTo === 'Income' || a.appliesTo === 'Expense' ? a.appliesTo : null,
        isDefault: true,
        isActive: a.isActive
      }));
      const personal = this.categorias.filter((c) => !c.isDefault);
      source = [...system, ...personal];
    } else {
      source = this.categorias;
    }
    this.categoryViews = sortByName(buildCategoryViews(source));
    this.overview = buildOverview(this.categoryViews);
    this.cdr.markForCheck();
  }

  loadAdmin(): void {
    this.adminLoading = true;
    this.adminCategoriesService.list(true).subscribe({
      next: (data) => { this.adminCategories = data; this.buildViews(); },
      error: () => { this.uiFeedback.error('Não foi possível carregar as categorias de sistema.'); this.adminLoading = false; this.cdr.markForCheck(); },
      complete: () => { this.adminLoading = false; this.cdr.markForCheck(); }
    });
  }

  // ---- Criar (usuário: pessoal / admin: pode escolher sistema) ---------------

  abrirModal(): void {
    this.showModal = true;
    this.resetCategoryForm();
  }

  fecharModal(): void {
    if (this.saving) return;
    this.showModal = false;
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

    this.saving = true;

    if (this.isAdmin && this.escopo === 'default') {
      this.adminCategoriesService.create({ name: nomeLimpo, appliesTo: this.tipo }).subscribe({
        next: () => {
          this.resetCategoryForm();
          this.showModal = false;
          this.loadAdmin();
          this.categoriesService.invalidateCache();
          this.categoriesStore.refresh();
          this.uiFeedback.success('Categoria de sistema criada com sucesso.');
        },
        error: () => { this.uiFeedback.error('Erro ao criar categoria de sistema.'); this.saving = false; this.cdr.markForCheck(); },
        complete: () => { this.saving = false; this.cdr.markForCheck(); }
      });
      return;
    }

    this.categoriesService.create({ name: nomeLimpo, appliesTo: this.tipo }).subscribe({
      next: () => {
        this.categoriesStore.refresh();
        this.resetCategoryForm();
        this.showModal = false;
        this.uiFeedback.success('Categoria criada com sucesso.');
      },
      error: (err) => { this.uiFeedback.error(err?.error ?? 'Erro ao criar categoria.'); this.saving = false; this.cdr.markForCheck(); },
      complete: () => { this.saving = false; this.cdr.markForCheck(); }
    });
  }

  // ---- Editar / ativar-desativar (admin, categorias de sistema) --------------

  onEditView(view: CategoryView): void {
    if (!this.isAdmin || view.origin !== 'default') return;
    const admin = this.adminCategories.find((c) => c.id === view.category.id);
    if (!admin) return;
    this.adminEditing = admin;
    this.adminName = admin.name;
    this.adminAppliesTo = (admin.appliesTo as CategoryType) || '';
    this.showAdminModal = true;
  }

  onToggleView(view: CategoryView): void {
    if (!this.isAdmin || view.origin !== 'default' || this.adminSaving) return;
    const admin = this.adminCategories.find((c) => c.id === view.category.id);
    if (!admin) return;
    const next = !admin.isActive;
    admin.isActive = next;
    this.adminSaving = true;
    this.buildViews();
    this.adminCategoriesService.updateStatus(admin.id, next).subscribe({
      next: (updated) => { admin.isActive = updated.isActive; this.categoriesService.invalidateCache(); this.categoriesStore.refresh(); this.buildViews(); },
      error: () => { admin.isActive = !next; this.uiFeedback.error('Não foi possível atualizar o status.'); this.buildViews(); },
      complete: () => { this.adminSaving = false; this.cdr.markForCheck(); }
    });
  }

  closeAdminModal(): void {
    if (this.adminSaving) return;
    this.showAdminModal = false;
    this.adminEditing = null;
  }

  saveAdmin(): void {
    if (!this.adminEditing || !this.adminName.trim()) {
      this.uiFeedback.warning('Informe o nome da categoria.');
      return;
    }
    this.adminSaving = true;
    this.adminCategoriesService.update(this.adminEditing.id, { name: this.adminName.trim(), appliesTo: this.adminAppliesTo || null }).subscribe({
      next: () => {
        this.showAdminModal = false;
        this.adminEditing = null;
        this.loadAdmin();
        this.categoriesService.invalidateCache();
        this.categoriesStore.refresh();
      },
      error: () => { this.uiFeedback.error('Não foi possível salvar a categoria de sistema.'); this.adminSaving = false; this.cdr.markForCheck(); },
      complete: () => { this.adminSaving = false; this.cdr.markForCheck(); }
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
      const existsInAdmin = this.adminCategories.some((c) => sameName(c.name) && (c.appliesTo === type || c.appliesTo == null));
      return existsInAdmin ? 'admin' : null;
    }

    const duplicateDefault = this.categorias.some((c) => c.isDefault && c.appliesTo === type && sameName(c.name));
    if (duplicateDefault) return 'default';
    const duplicateUser = this.categorias.some((c) => !c.isDefault && c.appliesTo === type && sameName(c.name));
    if (duplicateUser) return 'user';
    return null;
  }

  private normalizeText(value: string): string {
    return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
  }
}
