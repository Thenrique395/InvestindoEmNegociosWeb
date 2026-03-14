import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface MonthlyFinancialSnapshotResponse {
  id: string;
  year: number;
  month: number;
  snapshotLabel: string;
  realAvailableBalance: number;
  projectedBalance: number;
  pendingExpenses: number;
  pendingIncomes: number;
  totalDebt: number;
  netWorth: number;
  riskScore: number;
  riskClassification: string;
  primaryInsight: string;
  recommendations: string[];
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class MonthlySnapshotsService {
  constructor(private readonly http: HttpClient) {}

  list(): Observable<MonthlyFinancialSnapshotResponse[]> {
    return this.http.get<MonthlyFinancialSnapshotResponse[]>(`${API_BASE_URL}/monthlysnapshots`);
  }

  generate(year: number, month: number): Observable<MonthlyFinancialSnapshotResponse> {
    return this.http.post<MonthlyFinancialSnapshotResponse>(`${API_BASE_URL}/monthlysnapshots/generate`, { year, month });
  }
}
