import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './api.config';
import { UserRole } from './roles';
import { SubscriptionChangeResponse } from './subscriptions.service';

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface AdminUserFeatureAccess {
  featureKey: string;
  effectiveEnabled: boolean;
  enabledByRole: boolean;
  overrideEnabled: boolean | null;
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

  listFeatures(id: string) {
    return this.http.get<AdminUserFeatureAccess[]>(`${this.baseUrl}/${id}/features`);
  }

  setFeatureOverride(id: string, featureKey: string, isEnabled: boolean) {
    return this.http.put<AdminUserFeatureAccess[]>(`${this.baseUrl}/${id}/features/${encodeURIComponent(featureKey)}`, { isEnabled });
  }

  clearFeatureOverride(id: string, featureKey: string) {
    return this.http.delete<AdminUserFeatureAccess[]>(`${this.baseUrl}/${id}/features/${encodeURIComponent(featureKey)}`);
  }

  grantTrial(id: string, planCode: string, days: number) {
    return this.http.post<SubscriptionChangeResponse>(`${this.baseUrl}/${id}/trial`, { planCode, days });
  }
}
