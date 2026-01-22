import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriesService, CategoryDto, CategoryType } from '../categories.service';
import { AdminCategoriesService, AdminCategory } from '../admin-categories.service';
import { AuthService } from '../auth.service';
import { hasAtLeastRole } from '../roles';

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
  erro = '';
  isAdmin = false;

  adminCategories: AdminCategory[] = [];
  adminLoading = false;
  adminError = '';
  includeInactive = true;
  adminSaving = false;
  showAdminModal = false;
  adminEditing: AdminCategory | null = null;
  adminName = '';
  adminAppliesTo: '' | CategoryType = '';

  tipos = [
    { id: 'Expense' as CategoryType, label: 'Despesa' },
    { id: 'Income' as CategoryType, label: 'Receita' }
  ];

  constructor(
    private categoriesService: CategoriesService,
    private adminCategoriesService: AdminCategoriesService,
    private authService: AuthService
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
    this.erro = '';
    this.categoriesService.list(this.filtroTipo || undefined).subscribe({
      next: (data) => (this.categorias = data),
      error: (err) => (this.erro = err?.error ?? 'Não foi possível carregar as categorias.'),
      complete: () => (this.loading = false)
    });
  }

  loadAdmin(): void {
    this.adminLoading = true;
    this.adminError = '';
    this.adminCategoriesService.list(this.includeInactive).subscribe({
      next: (data) => (this.adminCategories = data),
      error: () => (this.adminError = 'Não foi possível carregar as categorias padrão.'),
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
    this.erro = '';
  }

  fecharModal(): void {
    if (this.saving) return;
    this.showModal = false;
  }

  adicionar(): void {
    if (!this.nome.trim()) {
      this.erro = 'Informe o nome da categoria.';
      return;
    }
    this.saving = true;
    this.erro = '';

    if (this.isAdmin && this.escopo === 'default') {
      this.adminCategoriesService
        .create({ name: this.nome.trim(), appliesTo: this.tipo })
        .subscribe({
          next: () => {
            this.nome = '';
            this.escopo = 'user';
            this.loadAdmin();
            this.carregar();
          },
          error: () => (this.erro = 'Erro ao adicionar categoria padrão.'),
          complete: () => (this.saving = false)
        });
      return;
    }

    this.categoriesService.create({ name: this.nome.trim(), appliesTo: this.tipo }).subscribe({
      next: (cat) => {
        this.categorias = [...this.categorias, cat];
        this.nome = '';
        this.showModal = false;
      },
      error: (err) => (this.erro = err?.error ?? 'Erro ao adicionar categoria.'),
      complete: () => (this.saving = false)
    });
  }

  remover(cat: CategoryDto): void {
    if (cat.isDefault) return;
    const ok = confirm(`Remover a categoria "${cat.name}"?`);
    if (!ok) return;

    this.categoriesService.delete(cat.id).subscribe({
      next: () => (this.categorias = this.categorias.filter((c) => c.id !== cat.id)),
      error: (err) => (this.erro = err?.error ?? 'Não foi possível remover a categoria.')
    });
  }

  openAdminEdit(category: AdminCategory): void {
    this.adminEditing = category;
    this.adminName = category.name;
    this.adminAppliesTo = (category.appliesTo as CategoryType) || '';
    this.showAdminModal = true;
    this.adminError = '';
  }

  closeAdminModal(): void {
    if (this.adminSaving) return;
    this.showAdminModal = false;
    this.adminEditing = null;
  }

  saveAdmin(): void {
    if (!this.adminEditing || !this.adminName.trim()) {
      this.adminError = 'Informe o nome da categoria.';
      return;
    }
    this.adminSaving = true;
    this.adminError = '';
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
      error: () => (this.adminError = 'Não foi possível salvar a categoria padrão.'),
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
        this.adminError = 'Não foi possível atualizar o status.';
      },
      complete: () => (this.adminSaving = false)
    });
  }
}
