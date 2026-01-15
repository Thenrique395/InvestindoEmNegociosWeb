import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

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

  list(): Observable<CardDto[]> {
    return this.http.get<CardDto[]>(this.baseUrl);
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
}
