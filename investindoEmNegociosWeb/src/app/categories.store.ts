import { computed, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { CategoriesService, CategoryDto, CategoryType, CreateCategoryRequest } from './categories.service';
import { ListQuery } from './api-query';

type CategoriesState = {
  data: CategoryDto[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
};

const initialState = (): CategoriesState => ({
  data: [],
  loading: false,
  loaded: false,
  error: null
});

@Injectable({ providedIn: 'root' })
export class CategoriesStore {
  private readonly state = signal<CategoriesState>(initialState());
  private currentType?: CategoryType;
  private currentQuery?: ListQuery;

  readonly categories = computed(() => this.state().data);
  readonly loading = computed(() => this.state().loading);
  readonly loaded = computed(() => this.state().loaded);
  readonly error = computed(() => this.state().error);

  constructor(private categoriesService: CategoriesService) {}

  load(type?: CategoryType, query?: ListQuery, force = false): void {
    const current = this.state();
    const sameQuery = this.sameQuery(type, query);
    if (!force && sameQuery && (current.loaded || current.loading)) return;

    this.currentType = type;
    this.currentQuery = query;
    this.state.set({ ...current, loading: true, error: null });

    this.categoriesService.list(type, query)
      .pipe(finalize(() => this.patch({ loading: false })))
      .subscribe({
        next: (data) => this.state.set({ data: data || [], loading: false, loaded: true, error: null }),
        error: () => this.patch({ error: 'Não foi possível carregar as categorias.' })
      });
  }

  create(payload: CreateCategoryRequest): void {
    this.categoriesService.create(payload).subscribe({
      next: (category) => {
        this.categoriesService.invalidateCache();
        this.state.update((state) => ({
          ...state,
          data: [...state.data, category],
          loaded: true,
          error: null
        }));
      },
      error: () => this.patch({ error: 'Erro ao adicionar categoria.' })
    });
  }

  delete(id: string): void {
    this.categoriesService.delete(id).subscribe({
      next: () => {
        this.categoriesService.invalidateCache();
        this.state.update((state) => ({
          ...state,
          data: state.data.filter((category) => category.id !== id),
          error: null
        }));
      },
      error: () => this.patch({ error: 'Não foi possível remover a categoria.' })
    });
  }

  refresh(): void {
    this.categoriesService.invalidateCache();
    this.load(this.currentType, this.currentQuery, true);
  }

  reset(): void {
    this.categoriesService.invalidateCache();
    this.currentType = undefined;
    this.currentQuery = undefined;
    this.state.set(initialState());
  }

  private patch(patch: Partial<CategoriesState>): void {
    this.state.update((state) => ({ ...state, ...patch }));
  }

  private sameQuery(type?: CategoryType, query?: ListQuery): boolean {
    return JSON.stringify({ type: type ?? null, query: query ?? null }) ===
      JSON.stringify({ type: this.currentType ?? null, query: this.currentQuery ?? null });
  }
}
