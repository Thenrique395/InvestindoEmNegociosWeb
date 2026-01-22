import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminCategoriesService, AdminCategory } from '../admin-categories.service';

type AppliesToOption = '' | 'Income' | 'Expense';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-categories.component.html',
  styleUrls: ['./admin-categories.component.scss']
})
export class AdminCategoriesComponent implements OnInit {
  categories: AdminCategory[] = [];
  loading = false;
  error = '';
  includeInactive = true;
  showModal = false;
  saving = false;
  editing: AdminCategory | null = null;

  name = '';
  appliesTo: AppliesToOption = '';

  constructor(private adminCategories: AdminCategoriesService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.adminCategories.list(this.includeInactive).subscribe({
      next: (data) => (this.categories = data),
      error: () => (this.error = 'Não foi possível carregar as categorias.'),
      complete: () => (this.loading = false)
    });
  }

  toggleIncludeInactive(): void {
    this.includeInactive = !this.includeInactive;
    this.load();
  }

  openCreate(): void {
    this.editing = null;
    this.name = '';
    this.appliesTo = '';
    this.showModal = true;
  }

  openEdit(category: AdminCategory): void {
    this.editing = category;
    this.name = category.name;
    this.appliesTo = (category.appliesTo as AppliesToOption) || '';
    this.showModal = true;
  }

  closeModal(): void {
    if (this.saving) return;
    this.showModal = false;
  }

  save(): void {
    if (!this.name.trim()) {
      this.error = 'Informe o nome da categoria.';
      return;
    }

    this.saving = true;
    this.error = '';
    const payload = {
      name: this.name.trim(),
      appliesTo: this.appliesTo || null
    };

    const request = this.editing
      ? this.adminCategories.update(this.editing.id, payload)
      : this.adminCategories.create(payload);

    request.subscribe({
      next: () => {
        this.showModal = false;
        this.load();
      },
      error: () => (this.error = 'Não foi possível salvar a categoria.'),
      complete: () => (this.saving = false)
    });
  }

  toggleStatus(category: AdminCategory): void {
    if (this.saving) return;
    const next = !category.isActive;
    category.isActive = next;
    this.saving = true;

    this.adminCategories.updateStatus(category.id, next).subscribe({
      next: (updated) => (category.isActive = updated.isActive),
      error: () => {
        category.isActive = !next;
        this.error = 'Não foi possível atualizar o status.';
      },
      complete: () => (this.saving = false)
    });
  }
}
