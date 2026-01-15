import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriesService, CategoryDto, CategoryType } from '../categories.service';

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
  showModal = false;
  loading = false;
  saving = false;
  erro = '';

  tipos = [
    { id: 'Expense' as CategoryType, label: 'Despesa' },
    { id: 'Income' as CategoryType, label: 'Receita' }
  ];

  constructor(private categoriesService: CategoriesService) {}

  ngOnInit(): void {
    this.carregar();
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

  carregar(): void {
    this.loading = true;
    this.erro = '';
    this.categoriesService.list(this.filtroTipo || undefined).subscribe({
      next: (data) => (this.categorias = data),
      error: (err) => (this.erro = err?.error ?? 'Não foi possível carregar as categorias.'),
      complete: () => (this.loading = false)
    });
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
}
