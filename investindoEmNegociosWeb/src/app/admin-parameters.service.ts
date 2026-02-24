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

export interface InstitutionAdmin {
  id: number;
  name: string;
  type: 'Bank' | 'Broker';
  isActive: boolean;
}

export interface NotificationSettings {
  incomeUpcomingEnabled: boolean;
  incomeDaysBefore: number;
  expenseUpcomingEnabled: boolean;
  expenseDaysBefore: number;
  expenseOverdueEnabled: boolean;
  cardCloseSoonEnabled: boolean;
  cardCloseDaysBefore: number;
  cardCloseDayEnabled: boolean;
  monthCloseEnabled: boolean;
  monthSummaryEnabled: boolean;
  goalBelowExpectedEnabled: boolean;
  goalCompletedEnabled: boolean;
  goalInactivityEnabled: boolean;
  goalInactivityDays: number;
}

export interface RobotSettings {
  enabled: boolean;
  dailyRunTimeUtc: string;
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

  createCardBrand(name: string, code: string) {
    return this.http.post<CardBrandAdmin>(`${this.baseUrl}/card-brands`, { name, code });
  }

  listPaymentMethods() {
    return this.http.get<PaymentMethodAdmin[]>(`${this.baseUrl}/payment-methods`);
  }

  updatePaymentMethodStatus(id: number, isActive: boolean) {
    return this.http.put<PaymentMethodAdmin>(`${this.baseUrl}/payment-methods/${id}/status`, { isActive });
  }

  createPaymentMethod(name: string) {
    return this.http.post<PaymentMethodAdmin>(`${this.baseUrl}/payment-methods`, { name });
  }

  listInstitutions() {
    return this.http.get<InstitutionAdmin[]>(`${this.baseUrl}/institutions`);
  }

  createInstitution(name: string, type: 'Bank' | 'Broker') {
    return this.http.post<InstitutionAdmin>(`${this.baseUrl}/institutions`, { name, type });
  }

  updateInstitutionStatus(id: number, isActive: boolean) {
    return this.http.put<InstitutionAdmin>(`${this.baseUrl}/institutions/${id}/status`, { isActive });
  }

  getNotificationSettings() {
    return this.http.get<NotificationSettings>(`${this.baseUrl}/notification-settings`);
  }

  updateNotificationSettings(settings: NotificationSettings) {
    return this.http.put<NotificationSettings>(`${this.baseUrl}/notification-settings`, settings);
  }

  getRobotSettings() {
    return this.http.get<RobotSettings>(`${this.baseUrl}/robot-settings`);
  }

  updateRobotSettings(settings: RobotSettings) {
    return this.http.put<RobotSettings>(`${this.baseUrl}/robot-settings`, settings);
  }
}
