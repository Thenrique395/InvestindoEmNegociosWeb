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
  receivedOn: string; // DD/MM/YYYY
  schedule: ScheduleType;
  startDateIso: string; // yyyy-MM-dd
  isRecurring: boolean;
  recurringStart?: string | null; // MM/YYYY
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
  private readonly baseUrl = `${API_BASE_URL}/receitas/summary`;

  constructor(private http: HttpClient) {}

  getSummary(month?: string): Observable<IncomeSummaryResponse> {
    let params = new HttpParams();
    if (month) {
      params = params.set('month', month);
    }
    return this.http.get<IncomeSummaryResponse>(this.baseUrl, { params });
  }
}
