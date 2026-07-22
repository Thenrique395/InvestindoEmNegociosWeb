import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { applyListQuery, ListQuery } from './api-query';

export type CategoryType = 'Income' | 'Expense';

export interface CategoryDto {
  id: string;
  name: string;
  appliesTo: CategoryType | null;
  isDefault: boolean;
  isActive?: boolean;
}

export interface CreateCategoryRequest {
  name: string;
  appliesTo: CategoryType | null;
}

export type CategoryDeletionAction = 'deleted' | 'deactivated';

export interface CategoryDeletionResult {
  action: CategoryDeletionAction;
}

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly baseUrl = `${API_BASE_URL}/categories`;
  private readonly listCache = new Map<string, Observable<CategoryDto[]>>();

  constructor(private http: HttpClient) {}

  list(type?: CategoryType, query?: ListQuery, includeInactive = false): Observable<CategoryDto[]> {
    let params = new HttpParams();
    if (type) {
      params = params.set('appliesTo', type);
    }
    if (includeInactive) {
      params = params.set('includeInactive', 'true');
    }
    params = applyListQuery(params, query);

    const cacheKey = this.createListCacheKey(type, query, includeInactive);
    const cached = this.listCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const request$ = this.http.get<CategoryDto[]>(this.baseUrl, { params }).pipe(
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.listCache.set(cacheKey, request$);
    return request$;
  }

  create(payload: CreateCategoryRequest): Observable<CategoryDto> {
    return this.http.post<CategoryDto>(this.baseUrl, payload).pipe(
      tap(() => this.invalidateCache())
    );
  }

  /**
   * Categoria em uso é arquivada (soft delete) no backend; caso contrário é removida.
   * O resultado informa qual ação ocorreu para a UI dar o feedback correto.
   */
  delete(id: string): Observable<CategoryDeletionResult> {
    return this.http.delete<CategoryDeletionResult>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.invalidateCache())
    );
  }

  setStatus(id: string, isActive: boolean): Observable<CategoryDto> {
    return this.http.put<CategoryDto>(`${this.baseUrl}/${id}/status`, { isActive }).pipe(
      tap(() => this.invalidateCache())
    );
  }

  invalidateCache(): void {
    this.listCache.clear();
  }

  private createListCacheKey(type?: CategoryType, query?: ListQuery, includeInactive = false): string {
    return JSON.stringify({
      type: type ?? null,
      includeInactive,
      page: query?.page ?? null,
      pageSize: query?.pageSize ?? null,
      sortBy: query?.sortBy ?? null,
      sortDir: query?.sortDir ?? null
    });
  }
}
