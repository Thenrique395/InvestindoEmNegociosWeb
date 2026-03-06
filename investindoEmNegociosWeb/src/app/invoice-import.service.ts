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
  skipDuplicates: boolean;
  items: InvoiceItem[];
};

export type InvoiceImportResult = {
  created: number;
  skipped: number;
  failed: number;
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
}
