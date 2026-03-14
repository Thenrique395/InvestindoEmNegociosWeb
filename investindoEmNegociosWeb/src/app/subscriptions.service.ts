import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './api.config';
import { AuthResponse } from './auth.service';

export interface SubscriptionPlan {
  code: string;
  name: string;
  role: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  recommended: boolean;
  current: boolean;
  features: string[];
  limits: Record<string, string>;
}

export interface CurrentSubscription {
  planCode: string;
  planName: string;
  role: string;
  status: string;
  billingCycle: string;
  priceAmount: number;
  currency: string;
  autoRenew: boolean;
  startedAt: string;
  renewsAt?: string | null;
  cancelledAt?: string | null;
}

export interface SubscriptionCatalogResponse {
  current: CurrentSubscription;
  plans: SubscriptionPlan[];
  notes: string[];
}

export interface SubscriptionChangeResponse {
  current: CurrentSubscription;
  session: AuthResponse;
  notes: string[];
}

@Injectable({ providedIn: 'root' })
export class SubscriptionsService {
  private readonly baseUrl = `${API_BASE_URL}/subscriptions`;

  constructor(private http: HttpClient) {}

  getCatalog() {
    return this.http.get<SubscriptionCatalogResponse>(`${this.baseUrl}/catalog`);
  }

  change(planCode: string, billingCycle: 'Monthly' | 'Yearly') {
    return this.http.post<SubscriptionChangeResponse>(`${this.baseUrl}/change`, { planCode, billingCycle });
  }

  cancel() {
    return this.http.post<SubscriptionChangeResponse>(`${this.baseUrl}/cancel`, {});
  }
}
