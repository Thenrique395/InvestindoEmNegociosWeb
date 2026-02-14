import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './api.config';

export type InvoiceItem = {
  date?: string;
  description: string;
  amount?: string;
};

export type InvoiceExtractResponse = {
  total?: string;
  dueDate?: string;
  closeDate?: string;
  cardName?: string;
  bankName?: string;
  items: InvoiceItem[];
  rawText: string;
};

@Injectable({ providedIn: 'root' })
export class InvoiceImportService {
  private readonly baseUrl = `${API_BASE_URL}/invoiceimport`;

  constructor(private http: HttpClient) {}

  extract(file: File) {
    const data = new FormData();
    data.append('file', file);
    return this.http.post<InvoiceExtractResponse>(`${this.baseUrl}/extract`, data);
  }
}
