import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export type AccountType = 'Checking' | 'Savings' | 'DigitalWallet' | 'Cash' | 'Other';
export type AccountTransactionKind = 'Credit' | 'Debit';

export interface AccountRequest {
  name: string;
  type: AccountType;
  initialBalance: number;
  isActive: boolean;
}

export interface AccountResponse {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountBalanceResponse {
  accountId: string;
  initialBalance: number;
  transactionsNet: number;
  currentBalance: number;
}

export interface AccountTransactionResponse {
  id: string;
  accountId: string;
  occurredAt: string;
  kind: AccountTransactionKind;
  amount: number;
  description: string;
  sourceType?: string | null;
  sourceId?: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AccountsService {
  private readonly baseUrl = `${API_BASE_URL}/accounts`;
  private readonly defaultAccountStorageKey = 'default_account_id';

  constructor(private http: HttpClient) {}

  list(): Observable<AccountResponse[]> {
    return this.http.get<AccountResponse[]>(this.baseUrl);
  }

  getDefaultAccountId(): string | null {
    const storage = this.safeStorage();
    return storage?.getItem(this.defaultAccountStorageKey) ?? null;
  }

  setDefaultAccountId(accountId: string | null): void {
    const storage = this.safeStorage();
    if (!storage) return;

    if (!accountId) {
      storage.removeItem(this.defaultAccountStorageKey);
      return;
    }
    storage.setItem(this.defaultAccountStorageKey, accountId);
  }

  resolveDefaultAccountId(accounts: AccountResponse[]): string | null {
    if (!accounts.length) {
      this.setDefaultAccountId(null);
      return null;
    }

    const stored = this.getDefaultAccountId();
    if (stored && accounts.some((a) => a.id === stored && a.isActive)) {
      return stored;
    }

    const fallback = accounts.find((a) => a.isActive)?.id ?? accounts[0].id;
    this.setDefaultAccountId(fallback);
    return fallback;
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

  private safeStorage(): Storage | null {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return null;
    return window.localStorage;
  }
}
