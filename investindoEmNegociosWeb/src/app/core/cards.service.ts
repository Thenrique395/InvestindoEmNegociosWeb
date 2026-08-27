import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { applyListQuery, ListQuery } from './api-query';

export interface CardDto {
  id: string;
  brandId: number;
  holderName: string;
  nickname: string;
  last4: string;
  bank?: string | null;
  creditLimit: number;
  statementCloseDay: number;
  dueDay: number;
  createdAt: string;
  updatedAt: string;
}

export interface CardPayload {
  brandId: number;
  holderName: string;
  last4: string;
  nickname?: string;
  bank?: string | null;
  creditLimit: number;
  statementCloseDay: number;
  dueDay: number;
}

export interface CardStatementInstallmentDto {
  installmentId: string;
  planId: string;
  title: string;
  installmentNo: number;
  purchaseDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  openAmount: number;
  status: string;
}

export interface CardStatementCycleDto {
  statementYear: number;
  statementMonth: number;
  statementCloseDate: string;
  statementDueDate: string;
  totalAmount: number;
  totalPaid: number;
  totalOpen: number;
  itemsCount: number;
  items: CardStatementInstallmentDto[];
}

@Injectable({ providedIn: 'root' })
export class CardsService {
  private readonly baseUrl = `${API_BASE_URL}/cards`;

  constructor(private http: HttpClient) {}

  list(query?: ListQuery): Observable<CardDto[]> {
    const params = applyListQuery(new HttpParams(), query);
    return this.http.get<CardDto[]>(this.baseUrl, { params });
  }

  create(payload: CardPayload): Observable<CardDto> {
    return this.http.post<CardDto>(this.baseUrl, payload);
  }

  update(id: string, payload: CardPayload): Observable<CardDto> {
    return this.http.put<CardDto>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  debtTotal(): Observable<{ total: number }> {
    return this.http.get<{ total: number }>(`${this.baseUrl}/debt/total`);
  }

  statements(cardId: string, options: { year?: number; month?: number } = {}): Observable<CardStatementCycleDto[]> {
    let params = new HttpParams();
    if (typeof options.year === 'number') params = params.set('year', String(options.year));
    if (typeof options.month === 'number') params = params.set('month', String(options.month));
    return this.http.get<CardStatementCycleDto[]>(`${this.baseUrl}/${cardId}/statements`, { params });
  }
}
