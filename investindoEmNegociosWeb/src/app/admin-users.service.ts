import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './api.config';
import { UserRole } from './roles';

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly baseUrl = `${API_BASE_URL}/admin/users`;

  constructor(private http: HttpClient) {}

  list() {
    return this.http.get<AdminUserSummary[]>(this.baseUrl);
  }

  updateRole(id: string, role: UserRole) {
    return this.http.put<AdminUserSummary>(`${this.baseUrl}/${id}/role`, { role });
  }

  updateStatus(id: string, isActive: boolean) {
    return this.http.put<AdminUserSummary>(`${this.baseUrl}/${id}/status`, { isActive });
  }

  remove(id: string) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
