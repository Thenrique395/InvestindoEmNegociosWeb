import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InstallmentStatus, MoneyType } from './types/money-types';

export interface Installment {
  id: string;
  planId: string;
  installmentNo: number;
  dueDate: string; // yyyy-MM-dd
  amount: number;
  status: InstallmentStatus;
}

export interface PaymentPayload {
  paidAmount: number;
  paidAt: string; // ISO datetime
  methodId?: number | null;
  note?: string | null;
}

@Injectable({ providedIn: 'root' })
export class InstallmentsService {
  private readonly baseUrl = 'http://localhost:5059/api/installments';

  constructor(private http: HttpClient) {}

  list(options: { status?: InstallmentStatus; from?: string; to?: string; type?: MoneyType } = {}): Observable<Installment[]> {
    let params = new HttpParams();
    if (options.status) params = params.set('status', options.status);
    if (options.from) params = params.set('from', options.from);
    if (options.to) params = params.set('to', options.to);
    if (options.type) params = params.set('type', options.type);
    return this.http.get<Installment[]>(this.baseUrl, { params });
  }

  pay(id: string, payload: PaymentPayload) {
    return this.http.post(`${this.baseUrl}/${id}/payments`, payload);
  }

  delete(id: string) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
