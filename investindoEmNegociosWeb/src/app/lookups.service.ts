import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface PaymentMethodLookup {
  id: number;
  code: string;
  name: string;
}

export interface CardBrandLookup {
  id: number;
  code: string;
  name: string;
  isActive?: boolean;
}

export interface InstitutionLookup {
  id: number;
  name: string;
  type: 'Bank' | 'Broker';
}

@Injectable({ providedIn: 'root' })
export class LookupsService {
  private readonly baseUrl = `${API_BASE_URL}/lookups`;

  constructor(private http: HttpClient) {}

  paymentMethods(): Observable<PaymentMethodLookup[]> {
    return this.http.get<PaymentMethodLookup[]>(`${this.baseUrl}/payment-methods`);
  }

  cardBrands(): Observable<CardBrandLookup[]> {
    return this.http.get<CardBrandLookup[]>(`${this.baseUrl}/card-brands`);
  }

  institutions(type?: 'Bank' | 'Broker'): Observable<InstitutionLookup[]> {
    const query = type ? `?type=${type}` : '';
    return this.http.get<InstitutionLookup[]>(`${this.baseUrl}/institutions${query}`);
  }
}
