import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface CategoryExpenseResponse {
  categoryName: string;
  amount: number;
  percentageOfTotal: number;
}

export interface MonthlySummaryReportResponse {
  year: number;
  month: number;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  savingsRate: number;
  expensesByCategory: CategoryExpenseResponse[];
  topExpenses: CategoryExpenseResponse[];
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  constructor(private readonly http: HttpClient) {}

  getMonthlySummary(year: number, month: number): Observable<MonthlySummaryReportResponse> {
    return this.http.get<MonthlySummaryReportResponse>(`${API_BASE_URL}/reports/monthly-summary/${year}/${month}`);
  }
}
