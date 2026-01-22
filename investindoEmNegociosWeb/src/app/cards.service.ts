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

  delete(id: string) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  debtTotal(): Observable<{ total: number }> {
    return this.http.get<{ total: number }>(`${this.baseUrl}/debt/total`);
  }
}
