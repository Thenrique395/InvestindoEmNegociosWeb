import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export type LoanAmortizationType = 'Price' | 'Sac';
export type LoanStatus = 'Active' | 'Closed';
export type LoanInstallmentStatus = 'Open' | 'Paid';

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

@Injectable({ providedIn: 'root' })
export class LoansService {
  constructor(private readonly http: HttpClient) {}

  list(): Observable<LoanContractResponse[]> {
    return this.http.get<LoanContractResponse[]>(`${API_BASE_URL}/loans`);
  }

  simulate(request: LoanContractRequest): Observable<LoanSimulationResponse> {
    return this.http.post<LoanSimulationResponse>(`${API_BASE_URL}/loans/simulate`, request);
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
}
