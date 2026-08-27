import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './api.config';

export interface StartBillingCheckoutResponse {
  checkoutId: string;
  provider: string;
  status: string;
  checkoutUrl: string;
  planCode: string;
  billingCycle: string;
  amount: number;
  currency: string;
  expiresAt?: string | null;
}

export interface BillingCheckoutStatusResponse {
  checkoutId: string;
  provider: string;
  status: string;
  planCode: string;
  billingCycle: string;
  amount: number;
  currency: string;
  providerCheckoutId?: string | null;
  providerSubscriptionId?: string | null;
  providerPaymentStatus?: string | null;
  requiresLogin: boolean;
  canRetry: boolean;
  canOpenPortal: boolean;
  subscriptionActive: boolean;
  autoRenew: boolean;
  expiresAt?: string | null;
  completedAt?: string | null;
  renewsAt?: string | null;
  cancelledAt?: string | null;
  refundedAt?: string | null;
  failureReason?: string | null;
}

export interface BillingPortalSessionResponse {
  url: string;
}

@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly baseUrl = `${API_BASE_URL}/billing`;

  constructor(private readonly http: HttpClient) {}

  startCheckout(planCode: string, billingCycle: 'Monthly' | 'Yearly') {
    return this.http.post<StartBillingCheckoutResponse>(`${this.baseUrl}/checkout`, {
      planCode,
      billingCycle
    });
  }

  getCheckoutStatus(checkoutId: string) {
    return this.http.get<BillingCheckoutStatusResponse>(`${this.baseUrl}/checkout-status/${checkoutId}`);
  }

  getCheckoutStatusBySession(sessionId: string) {
    return this.http.get<BillingCheckoutStatusResponse>(`${this.baseUrl}/checkout-status/by-session/${encodeURIComponent(sessionId)}`);
  }

  createPortalSession() {
    return this.http.post<BillingPortalSessionResponse>(`${this.baseUrl}/portal`, {});
  }
}
