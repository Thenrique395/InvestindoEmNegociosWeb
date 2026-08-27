import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InstallmentStatus, MoneyType } from './types/money-types';
import { API_BASE_URL } from './api.config';
import { applyListQuery, ListQuery } from './api-query';

export interface Installment {
  id: string;
  planId: string;
  installmentNo: number;
  dueDate: string; // yyyy-MM-dd
  amount: number;
  status: InstallmentStatus;
  statementYear?: number | null;
  statementMonth?: number | null;
  statementCloseDate?: string | null;
  statementDueDate?: string | null;
  statementReference?: string | null;
}

export interface PaymentPayload {
  paidAmount: number;
  paidAt: string; // ISO datetime
  methodId?: number | null;
  note?: string | null;
  accountId?: string | null;
}

export interface InstallmentPayment {
  id: string;
  paidAt: string;
  paidAmount: number;
  methodId?: number | null;
  note?: string | null;
  isReversal: boolean;
  canReverse: boolean;
  receiptUrl?: string | null;
}

export interface PaymentReversalPayload {
  reversedAt?: string | null;
  note?: string | null;
}

@Injectable({ providedIn: 'root' })
export class InstallmentsService {
  private readonly baseUrl = `${API_BASE_URL}/installments`;

  constructor(private http: HttpClient) {}

  list(options: { status?: InstallmentStatus; from?: string; to?: string; type?: MoneyType; query?: ListQuery } = {}): Observable<Installment[]> {
    let params = new HttpParams();
    if (options.status) params = params.set('status', options.status);
    if (options.from) params = params.set('from', options.from);
    if (options.to) params = params.set('to', options.to);
    if (options.type) params = params.set('type', options.type);
    params = applyListQuery(params, options.query);
    return this.http.get<Installment[]>(this.baseUrl, { params });
  }

  /** Edita valor e vencimento de uma única parcela in-place (preserva pagamentos). */
  update(id: string, payload: { amount: number; dueDate: string }): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, payload);
  }

  pay(id: string, payload: PaymentPayload) {
    return this.http.post(`${this.baseUrl}/${id}/payments`, payload);
  }

  listPayments(id: string): Observable<InstallmentPayment[]> {
    return this.http.get<InstallmentPayment[]>(`${this.baseUrl}/${id}/payments`);
  }

  reversePayment(id: string, paymentId: string, payload: PaymentReversalPayload = {}) {
    return this.http.post(`${this.baseUrl}/${id}/payments/${paymentId}/reversals`, payload);
  }

  uploadReceipt(id: string, paymentId: string, file: File): Observable<{ receiptUrl: string }> {
    const data = new FormData();
    data.append('receipt', file);
    return this.http.post<{ receiptUrl: string }>(`${this.baseUrl}/${id}/payments/${paymentId}/receipt`, data);
  }

  anticipate(id: string, payload: { dueDate: string; note?: string | null }) {
    // Se o backend não suportar PATCH, use POST /anticipations
    return this.http.post(`${this.baseUrl}/${id}/anticipations`, {
      dueDate: payload.dueDate,
      note: payload.note || null
    });
  }

  delete(id: string) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
