import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export type LoanAmortizationType = 'Price' | 'Sac';
export type LoanStatus = 'Active' | 'Closed' | 'Draft' | 'Overdue' | 'Cancelled' | 'Archived' | 'Renegotiated';
export type LoanInstallmentStatus = 'Open' | 'Paid' | 'Overdue' | 'PartiallyPaid' | 'Anticipated' | 'Cancelled' | 'Renegotiated';

export interface LoanContractRequest {
  title: string;
  principalAmount: number;
  annualInterestRate: number;
  termMonths: number;
  amortizationType: LoanAmortizationType;
  startDate: string;
  paymentDay: number;
}

export interface LoanInstallmentResponse {
  id: string;
  installmentNo: number;
  dueDate: string;
  beginningBalance: number;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  endingBalance: number;
  status: LoanInstallmentStatus;
  paidAt?: string | null;
}

export interface LoanContractResponse {
  id: string;
  title: string;
  principalAmount: number;
  annualInterestRate: number;
  termMonths: number;
  amortizationType: LoanAmortizationType;
  startDate: string;
  paymentDay: number;
  monthlyPayment: number;
  totalCost: number;
  totalInterest: number;
  status: LoanStatus;
  openBalance: number;
  openInstallments: number;
  createdAt: string;
  installments: LoanInstallmentResponse[];
}

export interface LoanSimulationResponse {
  monthlyPayment: number;
  totalCost: number;
  totalInterest: number;
  amortizationType: LoanAmortizationType;
  installments: LoanInstallmentResponse[];
}

export interface LoanSimulationComparison {
  price: LoanSimulationResponse;
  sac: LoanSimulationResponse;
}

export interface LoanPaymentRequest {
  paidAt: string;
  amountPaid?: number | null;
  penaltyAmount?: number;
  discountAmount?: number;
  accountId?: string | null;
  methodId?: number | null;
  note?: string | null;
  idempotencyKey?: string | null;
}

export interface LoanContractSummary {
  id: string;
  status: LoanStatus;
  openBalance: number;
  paidAmount: number;
  paidPrincipal: number;
  paidInterest: number;
  openInstallments: number;
  nextDueDate?: string | null;
  monthlyPayment: number;
}

export interface LoanPaymentResult {
  paymentId: string;
  contractId: string;
  installmentId: string;
  amount: number;
  principalAmount: number;
  interestAmount: number;
  penaltyAmount: number;
  discountAmount: number;
  paidAt: string;
  accountTransactionId?: string | null;
  receiptUrl?: string | null;
  installment: LoanInstallmentResponse;
  contract: LoanContractSummary;
}

export interface LoanTimelineEvent {
  at: string;
  type: string;
  title: string;
  amount?: number | null;
}

export type LoanAmortizationStrategy = 'ReduceTerm' | 'ReducePayment' | 'FullSettlement';

export interface LoanAmortizationRequest {
  amount: number;
  strategy: LoanAmortizationStrategy;
  effectiveDate?: string | null;
  accountId?: string | null;
  methodId?: number | null;
  note?: string | null;
  idempotencyKey?: string | null;
}

export interface LoanAmortizationSimulationResult {
  strategy: LoanAmortizationStrategy;
  amount: number;
  previousBalance: number;
  newBalance: number;
  previousTerm: number;
  newTerm: number;
  previousPayment: number;
  newPayment: number;
  estimatedInterestBefore: number;
  estimatedInterestAfter: number;
  estimatedSavings: number;
  disclaimer: string;
}

export interface LoanAmortizationResult {
  amortizationId: string;
  contractId: string;
  simulation: LoanAmortizationSimulationResult;
  accountTransactionId?: string | null;
  contract: LoanContractSummary;
  installments: LoanInstallmentResponse[];
}

export interface LoanPaymentHistoryItem {
  id: string;
  paidAt: string;
  amount: number;
  principalAmount: number;
  interestAmount: number;
  penaltyAmount: number;
  discountAmount: number;
  accountId?: string | null;
  note?: string | null;
  receiptUrl?: string | null;
  isReversed: boolean;
  reversedAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class LoansService {
  constructor(private readonly http: HttpClient) {}

  list(): Observable<LoanContractResponse[]> {
    return this.http.get<LoanContractResponse[]>(`${API_BASE_URL}/loans`);
  }

  get(id: string): Observable<LoanContractResponse> {
    return this.http.get<LoanContractResponse>(`${API_BASE_URL}/loans/${id}`);
  }

  timeline(id: string): Observable<LoanTimelineEvent[]> {
    return this.http.get<LoanTimelineEvent[]>(`${API_BASE_URL}/loans/${id}/timeline`);
  }

  simulate(request: LoanContractRequest): Observable<LoanSimulationResponse> {
    return this.http.post<LoanSimulationResponse>(`${API_BASE_URL}/loans/simulate`, request);
  }

  compare(request: LoanContractRequest): Observable<LoanSimulationComparison> {
    return this.http.post<LoanSimulationComparison>(`${API_BASE_URL}/loans/simulations/compare`, request);
  }

  create(request: LoanContractRequest): Observable<LoanContractResponse> {
    return this.http.post<LoanContractResponse>(`${API_BASE_URL}/loans`, request);
  }

  update(id: string, request: LoanContractRequest): Observable<LoanContractResponse> {
    return this.http.put<LoanContractResponse>(`${API_BASE_URL}/loans/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/loans/${id}`);
  }

  payInstallment(contractId: string, installmentId: string): Observable<LoanInstallmentResponse> {
    return this.http.post<LoanInstallmentResponse>(`${API_BASE_URL}/loans/${contractId}/installments/${installmentId}/pay`, {});
  }

  /** Pagamento integrado: registra pagamento + movimentação em conta, com idempotência. */
  payInstallmentV2(contractId: string, installmentId: string, body: LoanPaymentRequest, idempotencyKey?: string): Observable<LoanPaymentResult> {
    const headers = idempotencyKey ? new HttpHeaders({ 'Idempotency-Key': idempotencyKey }) : undefined;
    return this.http.post<LoanPaymentResult>(
      `${API_BASE_URL}/loans/${contractId}/installments/${installmentId}/payments`, body, { headers });
  }

  reversePayment(contractId: string, installmentId: string, paymentId: string, reason?: string): Observable<LoanPaymentResult> {
    return this.http.post<LoanPaymentResult>(
      `${API_BASE_URL}/loans/${contractId}/installments/${installmentId}/payments/${paymentId}/reverse`, { reason });
  }

  listPayments(contractId: string, installmentId: string): Observable<LoanPaymentHistoryItem[]> {
    return this.http.get<LoanPaymentHistoryItem[]>(
      `${API_BASE_URL}/loans/${contractId}/installments/${installmentId}/payments`);
  }

  simulateAmortization(contractId: string, body: LoanAmortizationRequest): Observable<LoanAmortizationSimulationResult> {
    return this.http.post<LoanAmortizationSimulationResult>(`${API_BASE_URL}/loans/${contractId}/amortizations/simulate`, body);
  }

  confirmAmortization(contractId: string, body: LoanAmortizationRequest, idempotencyKey?: string): Observable<LoanAmortizationResult> {
    const headers = idempotencyKey ? new HttpHeaders({ 'Idempotency-Key': idempotencyKey }) : undefined;
    return this.http.post<LoanAmortizationResult>(`${API_BASE_URL}/loans/${contractId}/amortizations`, body, { headers });
  }

  archive(id: string): Observable<LoanContractResponse> {
    return this.http.post<LoanContractResponse>(`${API_BASE_URL}/loans/${id}/archive`, {});
  }

  cancel(id: string): Observable<LoanContractResponse> {
    return this.http.post<LoanContractResponse>(`${API_BASE_URL}/loans/${id}/cancel`, {});
  }
}
