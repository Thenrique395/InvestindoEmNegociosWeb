import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export type InvestmentType = 'RF' | 'ACOES' | 'FUNDOS' | 'CRIPTO';
export type MovementType = 'APORTE' | 'RESGATE';

export interface InvestmentGoal {
  id: string;
  targetAmount: number;
}

export interface InvestmentMovement {
  id: string;
  type: MovementType;
  quantity: number;
  price: number;
  date: string;
  note?: string;
}

export interface InvestmentPosition {
  id: string;
  type: InvestmentType;
  asset: string;
  quantity: number;
  avgPrice: number;
  openedAt: string;
  account: string;
  category?: string;
  note?: string;
  movements: InvestmentMovement[];
}

export interface InvestmentPositionRequest {
  type: InvestmentType;
  asset: string;
  quantity: number;
  avgPrice: number;
  openedAt: string;
  account: string;
  category: string;
  note?: string | null;
}

export interface InvestmentMovementRequest {
  type: MovementType;
  quantity: number;
  price: number;
  date: string;
  note?: string | null;
}

@Injectable({ providedIn: 'root' })
export class InvestmentsService {
  private baseUrl = `${API_BASE_URL}/investments`;

  constructor(private http: HttpClient) {}

  getGoal(): Observable<InvestmentGoal | null> {
    return this.http.get<InvestmentGoal | null>(`${this.baseUrl}/goal`);
  }

  upsertGoal(targetAmount: number): Observable<InvestmentGoal> {
    return this.http.put<InvestmentGoal>(`${this.baseUrl}/goal`, { targetAmount });
  }

  listPositions(): Observable<InvestmentPosition[]> {
    return this.http.get<InvestmentPosition[]>(`${this.baseUrl}/positions`);
  }

  createPosition(payload: InvestmentPositionRequest): Observable<InvestmentPosition> {
    return this.http.post<InvestmentPosition>(`${this.baseUrl}/positions`, payload);
  }

  updatePosition(id: string, payload: InvestmentPositionRequest): Observable<InvestmentPosition> {
    return this.http.put<InvestmentPosition>(`${this.baseUrl}/positions/${id}`, payload);
  }

  deletePosition(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/positions/${id}`);
  }

  addMovement(positionId: string, payload: InvestmentMovementRequest): Observable<InvestmentMovement> {
    return this.http.post<InvestmentMovement>(`${this.baseUrl}/positions/${positionId}/movements`, payload);
  }
}
