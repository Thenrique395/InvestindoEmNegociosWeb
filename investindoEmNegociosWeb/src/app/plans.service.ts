import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MoneyType, ScheduleType } from './types/money-types';

export interface Plan {
  id: string;
  userId: string;
  type: MoneyType;
  title: string;
  amount: number;
  schedule: ScheduleType;
  frequency?: string | null;
  installmentsCount?: number | null;
  startDate: string;
  status: string;
}

export interface CreatePlanPayload {
  type: MoneyType;
  title: string;
  amount: number;
  schedule: ScheduleType;
  startDate: string; // ISO (yyyy-MM-dd)
  frequency?: string | null;
  installmentsCount?: number | null;
  defaultPaymentMethodId?: number | null;
  categoryId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PlansService {
  private readonly baseUrl = 'http://localhost:5059/api/plans';

  constructor(private http: HttpClient) {}

  list(type?: MoneyType): Observable<Plan[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    return this.http.get<Plan[]>(this.baseUrl, { params });
  }

  getWithInstallments(id: string): Observable<{ plan: Plan; installments: InstallmentSummary[] }> {
    return this.http.get<{ plan: Plan; installments: InstallmentSummary[] }>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreatePlanPayload): Observable<Plan> {
    return this.http.post<Plan>(this.baseUrl, payload);
  }

  update(id: string, payload: CreatePlanPayload): Observable<Plan> {
    return this.http.put<Plan>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

export interface InstallmentSummary {
  id: string;
  planId: string;
  installmentNo: number;
  dueDate: string;
  amount: number;
  status: string;
}
