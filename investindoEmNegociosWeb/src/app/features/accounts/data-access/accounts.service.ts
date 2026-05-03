import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../api.config';
import {
  AccountRequest,
  AccountResponse,
  AccountBalanceResponse,
  CashflowProjectionResponse,
  AccountTransactionKind,
  AccountTransactionResponse,
  AccountTransferRequest,
  AccountTransferResponse,
  DebtSummaryResponse,
  InsightEngineResponse,
  NetWorthHistoryResponse,
  NetWorthSummaryResponse,
  RealAvailableBalanceResponse,
  RecommendationEngineResponse,
  RiskBotAssessmentResponse,
} from '../models/account.models';

export interface OfxTransactionPreview {
  postedAt: string;
  amount: number;
  kind: AccountTransactionKind;
  description: string;
  memo?: string | null;
  externalId?: string | null;
  type?: string | null;
  isDuplicate: boolean;
  categoryId?: string | null;
  suggestedCategory?: {
    categoryId?: string | null;
    categoryName?: string | null;
    confidence?: number | null;
    score?: number | null;
    confidenceBand?: string | null;
    reasonCode?: string | null;
  } | null;
  suggestedRecurrence?: {
    isRecurringCandidate?: boolean;
    frequency?: string | null;
    score?: number | null;
    confidenceBand?: string | null;
    reasonCode?: string | null;
    evidenceLabel?: string | null;
  } | null;
}

export interface OfxExtractResponse {
  bankId?: string | null;
  branchId?: string | null;
  accountNumber?: string | null;
  accountType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  ledgerBalance?: number | null;
  items: OfxTransactionPreview[];
  rawText: string;
}

export interface CsvExtractResponse {
  delimiter: string;
  detectedColumns: string[];
  items: OfxTransactionPreview[];
  rawText: string;
}

export interface OfxImportItemRequest {
  postedAt: string;
  amount: number;
  kind: AccountTransactionKind;
  description: string;
  memo?: string | null;
  externalId?: string | null;
  type?: string | null;
  categoryId?: string | null;
}

export interface OfxImportRequest {
  accountId: string;
  skipDuplicates: boolean;
  items: OfxImportItemRequest[];
}

export interface OfxImportResult {
  created: number;
  skipped: number;
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

  getRealAvailableBalance(
    period: 'month' | 'quarter' | 'year',
    referenceDate?: string,
  ): Observable<RealAvailableBalanceResponse> {
    let params = new HttpParams().set('period', period);
    if (referenceDate) params = params.set('referenceDate', referenceDate);
    return this.http.get<RealAvailableBalanceResponse>(`${this.baseUrl}/summary/real-balance`, {
      params,
    });
  }

  getDebtSummary(referenceDate?: string): Observable<DebtSummaryResponse> {
    let params = new HttpParams();
    if (referenceDate) params = params.set('referenceDate', referenceDate);
    return this.http.get<DebtSummaryResponse>(`${this.baseUrl}/summary/debts`, { params });
  }

  getNetWorthSummary(referenceDate?: string): Observable<NetWorthSummaryResponse> {
    let params = new HttpParams();
    if (referenceDate) params = params.set('referenceDate', referenceDate);
    return this.http.get<NetWorthSummaryResponse>(`${this.baseUrl}/summary/net-worth`, { params });
  }

  getNetWorthHistory(months = 12, referenceDate?: string): Observable<NetWorthHistoryResponse> {
    let params = new HttpParams().set('months', months);
    if (referenceDate) params = params.set('referenceDate', referenceDate);
    return this.http.get<NetWorthHistoryResponse>(`${this.baseUrl}/summary/net-worth/history`, {
      params,
    });
  }

  getProjection(
    period: 'month' | 'quarter' | 'year',
    referenceDate?: string,
  ): Observable<CashflowProjectionResponse> {
    let params = new HttpParams().set('period', period);
    if (referenceDate) params = params.set('referenceDate', referenceDate);
    return this.http.get<CashflowProjectionResponse>(`${this.baseUrl}/summary/projection`, {
      params,
    });
  }

  getRiskAssessment(
    period: 'month' | 'quarter' | 'year',
    referenceDate?: string,
  ): Observable<RiskBotAssessmentResponse> {
    let params = new HttpParams().set('period', period);
    if (referenceDate) params = params.set('referenceDate', referenceDate);
    return this.http.get<RiskBotAssessmentResponse>(`${this.baseUrl}/summary/risk`, {
      params,
    });
  }

  getInsights(
    period: 'month' | 'quarter' | 'year',
    referenceDate?: string,
  ): Observable<InsightEngineResponse> {
    let params = new HttpParams().set('period', period);
    if (referenceDate) params = params.set('referenceDate', referenceDate);
    return this.http.get<InsightEngineResponse>(`${this.baseUrl}/summary/insights`, { params });
  }

  getRecommendations(
    period: 'month' | 'quarter' | 'year',
    referenceDate?: string,
  ): Observable<RecommendationEngineResponse> {
    let params = new HttpParams().set('period', period);
    if (referenceDate) params = params.set('referenceDate', referenceDate);
    return this.http.get<RecommendationEngineResponse>(
      `${this.baseUrl}/summary/recommendations`,
      { params },
    );
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

  extractOfx(file: File, accountId?: string | null): Observable<OfxExtractResponse> {
    const data = new FormData();
    data.append('file', file);
    if (accountId) data.append('accountId', accountId);
    return this.http.post<OfxExtractResponse>(`${this.baseUrl}/ofx/extract`, data);
  }

  importOfx(payload: OfxImportRequest): Observable<OfxImportResult> {
    return this.http.post<OfxImportResult>(`${this.baseUrl}/ofx/import`, payload);
  }

  extractCsv(file: File, accountId?: string | null): Observable<CsvExtractResponse> {
    const data = new FormData();
    data.append('file', file);
    if (accountId) data.append('accountId', accountId);
    return this.http.post<CsvExtractResponse>(`${this.baseUrl}/csv/extract`, data);
  }

  importCsv(payload: OfxImportRequest): Observable<OfxImportResult> {
    return this.http.post<OfxImportResult>(`${this.baseUrl}/csv/import`, payload);
  }

  private safeStorage(): Storage | null {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return null;
    return window.localStorage;
  }
}
