import { Component, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryDto, CategoryType } from '../categories.service';
import { AdminCategoriesService, AdminCategory } from '../admin-categories.service';
import { AuthService } from '../auth.service';
import { hasAtLeastRole } from '../roles';
import { UiFeedbackService } from '../ui-feedback.service';
import { CategoriesStore } from '../categories.store';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss']
})
export class CategoriesComponent implements OnInit {
  categorias: CategoryDto[] = [];
  filtroTipo: '' | CategoryType = '';
  buscaNome = '';
  nome = '';
  tipo: CategoryType = 'Expense';
  escopo: 'user' | 'default' = 'user';
  showModal = false;
  loading = false;
  saving = false;
  isAdmin = false;

  adminCategories: AdminCategory[] = [];
  adminLoading = false;
  includeInactive = true;
  adminSaving = false;
  showAdminModal = false;
  adminEditing: AdminCategory | null = null;
  adminName = '';
  adminAppliesTo: '' | CategoryType = '';
  showDeleteModal = false;
  deleteTarget: CategoryDto | null = null;
  activeView: 'user' | 'admin' = 'user';

  tipos = [
    { id: 'Expense' as CategoryType, label: 'Despesa' },
    { id: 'Income' as CategoryType, label: 'Receita' }
  ];

  constructor(
    private categoriesStore: CategoriesStore,
    private adminCategoriesService: AdminCategoriesService,
    private authService: AuthService,
    private uiFeedback: UiFeedbackService
  ) {
    effect(() => {
      this.categorias = this.categoriesStore.categories();
      this.loading = this.categoriesStore.loading();
    });
  }

  ngOnInit(): void {
    this.isAdmin = hasAtLeastRole(this.authService.getRole(), 'Admin');
    this.carregar();
    if (this.isAdmin) {
      this.loadAdmin();
      this.activeView = 'user';
    }
  }

  carregar(): void {
    this.categoriesStore.load(this.filtroTipo || undefined);
  }

  adicionar(): void {
    const nomeLimpo = this.nome.trim();
    if (!nomeLimpo) {
      this.uiFeedback.warning('Informe o nome da categoria.');
      return;
    }

    this.saving = true;

    this.categoriesStore.create({ name: nomeLimpo, appliesTo: this.tipo });

    this.nome = '';
    this.showModal = false;
    this.uiFeedback.success('Categoria adicionada com sucesso.');
    this.saving = false;
  }

  remover(cat: CategoryDto): void {
    if (cat.isDefault) return;
    this.categoriesStore.delete(cat.id);
    this.uiFeedback.success('Categoria removida com sucesso.');
  }

  loadAdmin(): void {
    this.adminLoading = true;
    this.adminCategoriesService.list(this.includeInactive).subscribe({
      next: (data) => (this.adminCategories = data),
      error: () => {
        this.uiFeedback.error('Não foi possível carregar as categorias padrão.');
        this.adminLoading = false;
      },
      complete: () => (this.adminLoading = false)
    });
  }
}
