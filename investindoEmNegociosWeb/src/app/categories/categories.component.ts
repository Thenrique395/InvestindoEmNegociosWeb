import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriesService, CategoryDto, CategoryType } from '../categories.service';
import { AdminCategoriesService, AdminCategory } from '../admin-categories.service';
import { AuthService } from '../auth.service';
import { hasAtLeastRole } from '../roles';
import { UiFeedbackService } from '../ui-feedback.service';

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

  tipos = [
    { id: 'Expense' as CategoryType, label: 'Despesa' },
    { id: 'Income' as CategoryType, label: 'Receita' }
  ];

  constructor(
    private categoriesService: CategoriesService,
    private adminCategoriesService: AdminCategoriesService,
    private authService: AuthService,
    private uiFeedback: UiFeedbackService
  ) {}

  ngOnInit(): void {
    this.isAdmin = hasAtLeastRole(this.authService.getRole(), 'Admin');
    this.carregar();
    if (this.isAdmin) {
      this.loadAdmin();
    }
  }

  get categoriasPadrao(): CategoryDto[] {
    return this.categorias.filter((c) => c.isDefault);
  }

  get categoriasUsuario(): CategoryDto[] {
    return this.categorias.filter((c) => !c.isDefault);
  }

  categoriasPorTipo(tipo: CategoryType): CategoryDto[] {
    return this.categorias.filter((c) => c.appliesTo === tipo);
  }

  iconForCategory(name: string, tipo: CategoryType): string {
    const key = name.trim().toLowerCase();
    const map: Record<string, string> = {
      mercado: '🛒',
      lazer: '🎯',
      salario: '💰',
      salário: '💰',
      aluguel: '🏠',
      transporte: '🚌',
      saúde: '🩺',
      educacao: '📚',
      educação: '📚',
      compras: '🛍️',
      'compras online': '🛒',
      investimentos: '📈'
    };

    if (map[key]) return map[key];
    return tipo === 'Income' ? '💵' : '🧾';
  }

  iconForAdminCategory(category: AdminCategory): string {
    const tipo = category.appliesTo === 'Income' || category.appliesTo === 'Expense' ? category.appliesTo : 'Expense';
    return this.iconForCategory(category.name, tipo);
  }

  carregar(): void {
    this.loading = true;
    this.categoriesService.list(this.filtroTipo || undefined).subscribe({
      next: (data) => (this.categorias = data),
      error: (err) => {
        this.uiFeedback.error(err?.error ?? 'Não foi possível carregar as categorias.');
        this.loading = false;
      },
      complete: () => (this.loading = false)
    });
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

  toggleIncludeInactive(): void {
    this.includeInactive = !this.includeInactive;
    this.loadAdmin();
  }

  abrirModal(): void {
    this.showModal = true;
    this.nome = '';
    this.tipo = 'Expense';
  }

  fecharModal(): void {
    if (this.saving) return;
    this.showModal = false;
  }

  adicionar(): void {
    if (!this.nome.trim()) {
      this.uiFeedback.warning('Informe o nome da categoria.');
      return;
    }
    this.saving = true;

    if (this.isAdmin && this.escopo === 'default') {
      this.adminCategoriesService
        .create({ name: this.nome.trim(), appliesTo: this.tipo })
        .subscribe({
          next: () => {
            this.nome = '';
            this.escopo = 'user';
            this.loadAdmin();
            this.carregar();
            this.uiFeedback.success('Categoria padrão adicionada com sucesso.');
          },
          error: () => {
            this.uiFeedback.error('Erro ao adicionar categoria padrão.');
            this.saving = false;
          },
          complete: () => (this.saving = false)
        });
      return;
    }

    this.categoriesService.create({ name: this.nome.trim(), appliesTo: this.tipo }).subscribe({
      next: (cat) => {
        this.categorias = [...this.categorias, cat];
        this.nome = '';
        this.showModal = false;
        this.uiFeedback.success('Categoria adicionada com sucesso.');
      },
      error: (err) => {
        this.uiFeedback.error(err?.error ?? 'Erro ao adicionar categoria.');
        this.saving = false;
      },
      complete: () => (this.saving = false)
    });
  }

  remover(cat: CategoryDto): void {
    if (cat.isDefault) return;
    this.deleteTarget = cat;
    this.showDeleteModal = true;
  }

  fecharDeleteModal(): void {
    this.showDeleteModal = false;
    this.deleteTarget = null;
  }

  confirmarRemocao(): void {
    if (!this.deleteTarget) return;
    const cat = this.deleteTarget;
    this.showDeleteModal = false;
    this.deleteTarget = null;

    this.categoriesService.delete(cat.id).subscribe({
      next: () => {
        this.categorias = this.categorias.filter((c) => c.id !== cat.id);
        this.uiFeedback.success('Categoria removida com sucesso.');
      },
      error: (err) => this.uiFeedback.error(err?.error ?? 'Não foi possível remover a categoria.')
    });
  }

  openAdminEdit(category: AdminCategory): void {
    this.adminEditing = category;
    this.adminName = category.name;
    this.adminAppliesTo = (category.appliesTo as CategoryType) || '';
    this.showAdminModal = true;
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
    const payload = {
      name: this.adminName.trim(),
      appliesTo: this.adminAppliesTo || null
    };

    this.adminCategoriesService.update(this.adminEditing.id, payload).subscribe({
      next: () => {
        this.showAdminModal = false;
        this.adminEditing = null;
        this.loadAdmin();
        this.carregar();
      },
      error: () => {
        this.uiFeedback.error('Não foi possível salvar a categoria padrão.');
        this.adminSaving = false;
      },
      complete: () => (this.adminSaving = false)
    });
  }

  toggleDefaultStatus(category: AdminCategory): void {
    if (this.adminSaving) return;
    const next = !category.isActive;
    category.isActive = next;
    this.adminSaving = true;
    this.adminCategoriesService.updateStatus(category.id, next).subscribe({
      next: (updated) => (category.isActive = updated.isActive),
      error: () => {
        category.isActive = !next;
        this.uiFeedback.error('Não foi possível atualizar o status.');
      },
      complete: () => (this.adminSaving = false)
    });
  }
}
