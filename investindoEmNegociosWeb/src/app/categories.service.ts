import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly baseUrl = `${API_BASE_URL}/categories`;

  constructor(private http: HttpClient) {}

  list(type?: CategoryType, query?: ListQuery): Observable<CategoryDto[]> {
    let params = new HttpParams();
    if (type) {
      params = params.set('appliesTo', type);
    }
    params = applyListQuery(params, query);
    return this.http.get<CategoryDto[]>(this.baseUrl, { params });
  }

  create(payload: CreateCategoryRequest): Observable<CategoryDto> {
    return this.http.post<CategoryDto>(this.baseUrl, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
