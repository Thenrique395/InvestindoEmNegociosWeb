import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface BudgetItemRequest {
  categoryName: string;
  plannedAmount: number;
}

export interface BudgetItemResponse {
  id: string;
  categoryName: string;
  plannedAmount: number;
  realizedAmount: number;
  variance: number;
}

export interface BudgetResponse {
  year: number;
  month: number;
  totalPlanned: number;
  totalRealized: number;
  totalVariance: number;
  items: BudgetItemResponse[];
}

@Injectable({ providedIn: 'root' })
export class BudgetService {
  constructor(private readonly http: HttpClient) {}

  get(year: number, month: number): Observable<BudgetResponse> {
    return this.http.get<BudgetResponse>(`${API_BASE_URL}/budget/${year}/${month}`);
  }

  upsertItems(year: number, month: number, items: BudgetItemRequest[]): Observable<BudgetResponse> {
    return this.http.put<BudgetResponse>(`${API_BASE_URL}/budget/${year}/${month}/items`, items);
  }

  deleteItem(itemId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/budget/items/${itemId}`);
  }
}
