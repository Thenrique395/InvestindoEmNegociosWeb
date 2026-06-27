import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { applyListQuery, ListQuery } from './api-query';

export type InvestmentType = 'RF' | 'ACOES' | 'FUNDOS' | 'CRIPTO' | 'IMOVEL' | 'VEICULO';
export type MovementType = 'APORTE' | 'RESGATE' | 'COMPRA' | 'VENDA' | 'DIVIDENDO' | 'JCP' | 'RENDIMENTO' | 'TAXA';

export type B3ImportStrategy = 'merge' | 'replace';

export interface InvestmentGoal {
  id: string;
  targetAmount: number;
}

export interface InvestmentAllocationTarget {
  rf: number;
  acoes: number;
  fundos: number;
  cripto: number;
  total: number;
}

export interface InvestmentAllocationTargetRequest {
  rf: number;
  acoes: number;
  fundos: number;
  cripto: number;
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
  currency: string;
  marketSymbol?: string | null;
  marketPrice?: number | null;
  marketChangePercent?: number | null;
  marketName?: string | null;
  marketLogoUrl?: string | null;
  marketSource?: string | null;
  marketProvider?: string | null;
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
  currency: string;
}

export interface InvestmentMovementRequest {
  type: MovementType;
  quantity: number;
  price: number;
  date: string;
  note?: string | null;
}

export interface B3ExtractPosition {
  product: string;
  type: string;
  institution: string;
  quantity: number;
  closingPrice: number;
  updatedValue: number;
}

export interface B3ExtractIncome {
  product: string;
  paymentDate: string;
  eventType: string;
  institution: string;
  quantity: number;
  unitPrice: number;
  netValue: number;
}

export interface B3ExtractTrade {
  code: string;
  period: string;
  institution: string;
  buyQuantity: number;
  sellQuantity: number;
  netQuantity: number;
  avgBuyPrice: number;
  avgSellPrice: number;
}

export interface B3ExtractResponse {
  importToken?: string;
  referenceMonth?: string;
  holderName?: string;
  document?: string;
  totals: {
    positions: number;
    incomes: number;
    trades: number;
  };
  positions: B3ExtractPosition[];
  incomes: B3ExtractIncome[];
  trades: B3ExtractTrade[];
  rawText?: string;
}

export interface InvestmentBenchmarkItem {
  name: string;
  returnPercent: number;
  source: string;
  isEstimated: boolean;
}

export interface InvestmentBenchmarksResponse {
  months: number;
  items: InvestmentBenchmarkItem[];
}

export interface MarketQuoteResponse {
  symbol: string;
  price: number | null;
  changePercent: number | null;
  currency: string;
  name: string | null;
  lastUpdatedUtc: string | null;
  source: string;
  isEstimated: boolean;
  providerLabel: string;
}

export interface MarketProfileResponse {
  symbol: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  website: string | null;
  logoUrl: string | null;
  source: string;
  isEstimated: boolean;
  providerLabel: string;
}

export interface MarketHistoryPointResponse {
  date: string;
  close: number;
}

export interface MarketHistoryResponse {
  symbol: string;
  period: string;
  source: string;
  isEstimated: boolean;
  providerLabel: string;
  points: MarketHistoryPointResponse[];
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

  getAllocationTarget(): Observable<InvestmentAllocationTarget> {
    return this.http.get<InvestmentAllocationTarget>(`${this.baseUrl}/allocation-target`);
  }

  upsertAllocationTarget(payload: InvestmentAllocationTargetRequest): Observable<InvestmentAllocationTarget> {
    return this.http.put<InvestmentAllocationTarget>(`${this.baseUrl}/allocation-target`, payload);
  }

  listPositions(query?: ListQuery): Observable<InvestmentPosition[]> {
    const params = applyListQuery(new HttpParams(), query);
    return this.http.get<InvestmentPosition[]>(`${this.baseUrl}/positions`, { params });
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

  extractB3Report(file: File): Observable<B3ExtractResponse> {
    const data = new FormData();
    data.append('file', file);
    return this.http.post<B3ExtractResponse>(`${this.baseUrl}/import/b3/extract`, data);
  }

  importB3Report(importToken: string, strategy: B3ImportStrategy): Observable<{ imported: number }> {
    return this.http.post<{ imported: number }>(`${this.baseUrl}/import/b3/confirm`, {
      importToken,
      strategy
    });
  }

  getBenchmarks(months = 6): Observable<InvestmentBenchmarksResponse> {
    const params = new HttpParams().set('months', months);
    return this.http.get<InvestmentBenchmarksResponse>(`${this.baseUrl}/benchmarks`, { params });
  }

  getMarketQuote(symbol: string): Observable<MarketQuoteResponse> {
    const params = new HttpParams().set('symbol', symbol);
    return this.http.get<MarketQuoteResponse>(`${this.baseUrl}/market/quote`, { params });
  }

  getMarketProfile(symbol: string): Observable<MarketProfileResponse> {
    const params = new HttpParams().set('symbol', symbol);
    return this.http.get<MarketProfileResponse>(`${this.baseUrl}/market/profile`, { params });
  }

  getMarketHistory(symbol: string, period = '6mo'): Observable<MarketHistoryResponse> {
    const params = new HttpParams().set('symbol', symbol).set('period', period);
    return this.http.get<MarketHistoryResponse>(`${this.baseUrl}/market/history`, { params });
  }
}
