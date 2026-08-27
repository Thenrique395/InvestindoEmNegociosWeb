import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './api.config';

export interface AdminCategory {
  id: string;
  name: string;
  appliesTo: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AdminCategoryRequest {
  name: string;
  appliesTo: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminCategoriesService {
  private readonly baseUrl = `${API_BASE_URL}/admin/categories`;

  constructor(private http: HttpClient) {}

  list(includeInactive = true) {
    return this.http.get<AdminCategory[]>(`${this.baseUrl}?includeInactive=${includeInactive}`);
  }

  create(payload: AdminCategoryRequest) {
    return this.http.post<AdminCategory>(this.baseUrl, payload);
  }

  update(id: string, payload: AdminCategoryRequest) {
    return this.http.put<AdminCategory>(`${this.baseUrl}/${id}`, payload);
  }

  updateStatus(id: string, isActive: boolean) {
    return this.http.put<AdminCategory>(`${this.baseUrl}/${id}/status`, { isActive });
  }
}
