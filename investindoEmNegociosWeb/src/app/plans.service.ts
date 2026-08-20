import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MoneyType, ScheduleType } from './types/money-types';
import { API_BASE_URL } from './api.config';
import { applyListQuery, ListQuery } from './api-query';

export interface PlanHistoryEventDto {
  type: string;
  occurredAt: string;
  actorName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  installmentId?: string | null;
  installmentNo?: number | null;
  derived: boolean;
}

export interface PlanHistoryInstallmentDto {
  id: string;
  installmentNo: number;
  dueDate: string;
  amount: number;
  status: string;
}

export interface PlanHistoryResponse {
  planId: string;
  schedule: string;
  installments: PlanHistoryInstallmentDto[];
  events: PlanHistoryEventDto[];
}

export interface Plan {
  id: string;
  userId: string;
  type: MoneyType;
  title: string;
  amount: number;
  schedule: ScheduleType;
  categoryId?: string | null;
  cardId?: string | null;
  frequency?: string | null;
  installmentsCount?: number | null;
  startDate: string;
  status: string;
  defaultPaymentMethodId?: number | null;
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
  cardId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PlansService {
  private readonly baseUrl = `${API_BASE_URL}/plans`;

  constructor(private http: HttpClient) {}

  list(type?: MoneyType, query?: ListQuery): Observable<Plan[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    params = applyListQuery(params, query);
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

  /** Histórico do lançamento: eventos gravados mais os deduzidos do estado atual. */
  history(id: string): Observable<PlanHistoryResponse> {
    return this.http.get<PlanHistoryResponse>(`${this.baseUrl}/${id}/history`);
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
