import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class LookupsService {
  private readonly baseUrl = 'http://localhost:5059/api/lookups';

  constructor(private http: HttpClient) {}

  paymentMethods(): Observable<PaymentMethodLookup[]> {
    return this.http.get<PaymentMethodLookup[]>(`${this.baseUrl}/payment-methods`);
  }

  cardBrands(): Observable<CardBrandLookup[]> {
    return this.http.get<CardBrandLookup[]>(`${this.baseUrl}/card-brands`);
  }
}
