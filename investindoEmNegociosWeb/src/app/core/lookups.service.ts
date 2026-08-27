import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface PaymentMethodLookup {
  id: number;
  code: string;
  name: string;
}

/**
 * Só o crédito abre cartão e parcelas; o resto é pagamento direto. A regra
 * mora aqui porque tanto o formulário de despesa quanto o onboarding precisam
 * dela para decidir o modo do lançamento a partir do método escolhido.
 */
export function isCreditPaymentMethod(metodo: PaymentMethodLookup | null | undefined): boolean {
  return (metodo?.name || '').toLowerCase().includes('crédito');
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
  private paymentMethodsCache$?: Observable<PaymentMethodLookup[]>;
  private cardBrandsCache$?: Observable<CardBrandLookup[]>;
  private readonly institutionsCache = new Map<string, Observable<InstitutionLookup[]>>();

  constructor(private http: HttpClient) {}

  paymentMethods(): Observable<PaymentMethodLookup[]> {
    if (!this.paymentMethodsCache$) {
      this.paymentMethodsCache$ = this.http.get<PaymentMethodLookup[]>(`${this.baseUrl}/payment-methods`).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.paymentMethodsCache$;
  }

  cardBrands(): Observable<CardBrandLookup[]> {
    if (!this.cardBrandsCache$) {
      this.cardBrandsCache$ = this.http.get<CardBrandLookup[]>(`${this.baseUrl}/card-brands`).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.cardBrandsCache$;
  }

  institutions(type?: 'Bank' | 'Broker'): Observable<InstitutionLookup[]> {
    const cacheKey = type ?? 'all';
    const cached = this.institutionsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const options = type ? { params: new HttpParams().set('type', type) } : undefined;
    const request$ = this.http.get<InstitutionLookup[]>(`${this.baseUrl}/institutions`, options).pipe(
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.institutionsCache.set(cacheKey, request$);
    return request$;
  }

  invalidateCache(): void {
    this.paymentMethodsCache$ = undefined;
    this.cardBrandsCache$ = undefined;
    this.institutionsCache.clear();
  }
}
