import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export type CategoryType = 'Income' | 'Expense';

export interface CategoryDto {
  id: string;
  name: string;
  appliesTo: CategoryType | null;
  isDefault: boolean;
}

export interface CreateCategoryRequest {
  name: string;
  appliesTo: CategoryType | null;
}

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly baseUrl = `${API_BASE_URL}/categories`;

  constructor(private http: HttpClient) {}

  list(type?: CategoryType): Observable<CategoryDto[]> {
    const url = type ? `${this.baseUrl}?appliesTo=${type}` : this.baseUrl;
    return this.http.get<CategoryDto[]>(url);
  }

  create(payload: CreateCategoryRequest): Observable<CategoryDto> {
    return this.http.post<CategoryDto>(this.baseUrl, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
