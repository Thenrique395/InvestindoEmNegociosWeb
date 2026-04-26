import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../api.config';
import {
  AccountRequest,
  AccountResponse,
  AccountBalanceResponse,
  AccountTransactionResponse,
  AccountTransferRequest,
  AccountTransferResponse
} from '../models/account.models';

@Injectable({ providedIn: 'root' })
export class AccountsService {
  private readonly baseUrl = `${API_BASE_URL}/accounts`;

  constructor(private http: HttpClient) {}

  list(): Observable<AccountResponse[]> {
    return this.http.get<AccountResponse[]>(this.baseUrl);
  }

  create(payload: AccountRequest): Observable<AccountResponse> {
    return this.http.post<AccountResponse>(this.baseUrl, payload);
  }

  update(id: string, payload: AccountRequest): Observable<AccountResponse> {
    return this.http.put<AccountResponse>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getBalance(id: string): Observable<AccountBalanceResponse> {
    return this.http.get<AccountBalanceResponse>(`${this.baseUrl}/${id}/balance`);
  }

  listTransactions(id: string, options: { fromUtc?: string; toUtc?: string } = {}): Observable<AccountTransactionResponse[]> {
    let params = new HttpParams();
    if (options.fromUtc) params = params.set('fromUtc', options.fromUtc);
    if (options.toUtc) params = params.set('toUtc', options.toUtc);
    return this.http.get<AccountTransactionResponse[]>(`${this.baseUrl}/${id}/transactions`, { params });
  }

  transfer(payload: AccountTransferRequest): Observable<AccountTransferResponse> {
    return this.http.post<AccountTransferResponse>(`${this.baseUrl}/transfers`, payload);
  }
}
