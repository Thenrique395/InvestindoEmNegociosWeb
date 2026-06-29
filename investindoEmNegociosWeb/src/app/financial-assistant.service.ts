import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { CashflowProjectionResponse, DebtSummaryResponse, InsightEngineResponse, NetWorthSummaryResponse, RealAvailableBalanceResponse, RecommendationEngineResponse, RiskBotAssessmentResponse } from './accounts.service';

export interface FinancialAssistantPromptContextResponse {
  referenceDate: string;
  realBalance: RealAvailableBalanceResponse;
  debts: DebtSummaryResponse;
  netWorth: NetWorthSummaryResponse;
  projection: CashflowProjectionResponse;
  risk: RiskBotAssessmentResponse;
  insights: InsightEngineResponse;
  recommendations: RecommendationEngineResponse;
  governanceSummary: string;
}

export interface FinancialAssistantChatResponse {
  allowed: boolean;
  question: string;
  answer: string;
  disclaimer: string;
  reasonCode: string;
  context: FinancialAssistantPromptContextResponse;
}

export type AiHealthStatus = 'critical' | 'warning' | 'ok';

export interface AiHealthAreaVerdict {
  area: 'cashflow' | 'divida' | 'patrimonio';
  status: AiHealthStatus;
  explanation: string;
}

export interface AiFinancialHealthResponse {
  referenceDate: string;
  overallStatus: AiHealthStatus;
  overallSummary: string;
  areas: AiHealthAreaVerdict[];
  generatedByAi: boolean;
}

@Injectable({ providedIn: 'root' })
export class FinancialAssistantService {
  private _conversation: FinancialAssistantChatResponse[] = [];

  get conversation(): FinancialAssistantChatResponse[] {
    return this._conversation;
  }

  addMessage(msg: FinancialAssistantChatResponse): void {
    this._conversation = [...this._conversation, msg];
  }

  clearConversation(): void {
    this._conversation = [];
  }

  constructor(private readonly http: HttpClient) {}

  context(referenceDate?: string): Observable<FinancialAssistantPromptContextResponse> {
    let params = new HttpParams();
    if (referenceDate) params = params.set('referenceDate', referenceDate);
    return this.http.get<FinancialAssistantPromptContextResponse>(`${API_BASE_URL}/financial-assistant/context`, { params });
  }

  chat(question: string, referenceDate?: string): Observable<FinancialAssistantChatResponse> {
    return this.http.post<FinancialAssistantChatResponse>(`${API_BASE_URL}/financial-assistant/chat`, { question, referenceDate });
  }

  health(referenceDate?: string): Observable<AiFinancialHealthResponse> {
    let params = new HttpParams();
    if (referenceDate) params = params.set('referenceDate', referenceDate);
    return this.http.get<AiFinancialHealthResponse>(`${API_BASE_URL}/financial-assistant/health`, { params });
  }
}
