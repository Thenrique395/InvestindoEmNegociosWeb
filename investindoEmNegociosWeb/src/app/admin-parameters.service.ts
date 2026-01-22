import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './api.config';

export interface CardBrandAdmin {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
}

export interface PaymentMethodAdmin {
  id: number;
  name: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminParametersService {
  private readonly baseUrl = `${API_BASE_URL}/admin/parameters`;

  constructor(private http: HttpClient) {}

  listCardBrands() {
    return this.http.get<CardBrandAdmin[]>(`${this.baseUrl}/card-brands`);
  }

  updateCardBrandStatus(id: number, isActive: boolean) {
    return this.http.put<CardBrandAdmin>(`${this.baseUrl}/card-brands/${id}/status`, { isActive });
  }

  listPaymentMethods() {
    return this.http.get<PaymentMethodAdmin[]>(`${this.baseUrl}/payment-methods`);
  }

  updatePaymentMethodStatus(id: number, isActive: boolean) {
    return this.http.put<PaymentMethodAdmin>(`${this.baseUrl}/payment-methods/${id}/status`, { isActive });
  }
}
