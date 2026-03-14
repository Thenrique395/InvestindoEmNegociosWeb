import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './api.config';

export type InvoiceItem = {
  date?: string;
  description: string;
  amount?: string;
  isInstallment?: boolean;
  installmentCurrent?: number;
  installmentTotal?: number;
  baseDescription?: string;
  categoryId?: string | null;
  suggestedCategoryId?: string | null;
  suggestedCategoryName?: string | null;
  suggestedCategoryConfidence?: number | null;
  suggestedCategoryScore?: number | null;
  suggestedCategoryConfidenceBand?: string | null;
  suggestedCategoryReasonCode?: string | null;
  suggestedRecurrence?: {
    isRecurringCandidate?: boolean;
    frequency?: string | null;
    score?: number | null;
    confidenceBand?: string | null;
    reasonCode?: string | null;
    evidenceLabel?: string | null;
  } | null;
};

export type InvoiceExtractResponse = {
  total?: string;
  dueDate?: string;
  closeDate?: string;
  cardName?: string;
  bankName?: string;
  totalDebitsBrazil?: string;
  currentBalance?: string;
  items: InvoiceItem[];
  rawText: string;
};

export type InvoiceImportRequest = {
  cardId?: string | null;
  categoryId?: string | null;
  defaultDueDate?: string | null;
  statementCloseDate?: string | null;
  invoiceTotal?: string | null;
  importIdempotencyKey?: string | null;
  skipDuplicates: boolean;
  items: InvoiceItem[];
};

export type InvoiceImportResult = {
  created: number;
  skipped: number;
  failed: number;
};

export type InvoiceReconciliationItem = {
  description: string;
  baseDescription?: string | null;
  date?: string | null;
  amount: number;
  isDuplicate: boolean;
  matchReason: string;
  statementYear: number;
  statementMonth: number;
  statementReference: string;
  statementDueDate: string;
  existingInstallmentId?: string | null;
};

export type InvoiceReconciliationCycle = {
  statementYear: number;
  statementMonth: number;
  statementCloseDate: string;
  statementDueDate: string;
  statementReference: string;
  currentTotalAmount: number;
  importedNewAmount: number;
  duplicateAmount: number;
  projectedTotalAmount: number;
  parsedInvoiceTotalAmount?: number | null;
  differenceAmount?: number | null;
  existingItemsCount: number;
  importedNewItemsCount: number;
  duplicateItemsCount: number;
  readyToClose: boolean;
};

export type InvoiceReconciliationResponse = {
  cardId: string;
  cardName: string;
  parsedInvoiceTotal?: string | null;
  parsedDueDate?: string | null;
  parsedCloseDate?: string | null;
  totalItems: number;
  newItems: number;
  duplicateItems: number;
  items: InvoiceReconciliationItem[];
  cycles: InvoiceReconciliationCycle[];
};

@Injectable({ providedIn: 'root' })
export class InvoiceImportService {
  private readonly baseUrl = `${API_BASE_URL}/invoice-import`;

  constructor(private http: HttpClient) {}

  extract(file: File) {
    const data = new FormData();
    data.append('file', file);
    return this.http.post<InvoiceExtractResponse>(`${this.baseUrl}/extract`, data);
  }

  import(payload: InvoiceImportRequest) {
    return this.http.post<InvoiceImportResult>(`${this.baseUrl}/import`, payload);
  }

  reconcile(payload: InvoiceImportRequest) {
    return this.http.post<InvoiceReconciliationResponse>(`${this.baseUrl}/reconcile`, payload);
  }
}
