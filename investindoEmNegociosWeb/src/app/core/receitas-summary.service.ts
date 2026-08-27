import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { ScheduleType } from './types/money-types';

export interface IncomeItemResponse {
  id: string;
  planId: string;
  source: string;
  amount: number;
  receivedOn: string; // yyyy-MM-dd (legacy compatível com dd/MM/yyyy)
  schedule: ScheduleType;
  startDateIso: string; // yyyy-MM-dd
  isRecurring: boolean;
  recurringStart?: string | null; // MM/YYYY
}

export interface IncomeListResponse {
  month: string; // yyyy-MM
  items: IncomeItemResponse[];
}

export interface IncomeSummaryResponse {
  month: string; // yyyy-MM
  total: number;
  totalRecurring: number;
  totalOneTime: number;
  items: IncomeItemResponse[];
  previousMonth?: IncomeMonthSummary | null;
  history: IncomeMonthSummary[];
}

export interface IncomeMonthSummary {
  month: string; // yyyy-MM
  total: number;
  totalRecurring: number;
  totalOneTime: number;
}

@Injectable({ providedIn: 'root' })
export class ReceitasSummaryService {
  private readonly baseUrl = `${API_BASE_URL}/incomes`;

  constructor(private http: HttpClient) {}

  getList(month?: string): Observable<IncomeListResponse> {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    return this.http.get<IncomeListResponse>(this.baseUrl, { params });
  }

  getSummary(month?: string): Observable<IncomeSummaryResponse> {
    let params = new HttpParams();
    if (month) {
      params = params.set('month', month);
    }
    return this.http.get<IncomeSummaryResponse>(`${this.baseUrl}/summary`, { params });
  }
}
