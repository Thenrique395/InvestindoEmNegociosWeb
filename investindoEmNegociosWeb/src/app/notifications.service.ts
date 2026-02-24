import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './api.config';

export type NotificationKind =
  | 'IncomeUpcoming'
  | 'ExpenseUpcoming'
  | 'ExpenseOverdue'
  | 'CardClosingSoon'
  | 'CardClosingDay'
  | 'MonthClosing'
  | 'MonthSummary'
  | 'GoalBelowExpected'
  | 'GoalCompleted'
  | 'GoalInactive'
  | 'Upcoming'
  | 'Overdue'
  | 'CashflowInsight';
export type MoneyType = 'Income' | 'Expense';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  kind: NotificationKind;
  moneyType?: MoneyType | null;
  dueDate?: string | null;
  createdAt: string;
  readAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly baseUrl = `${API_BASE_URL}/notifications`;

  constructor(private http: HttpClient) {}

  list(unreadOnly = false, limit = 50) {
    return this.http.get<NotificationItem[]>(this.baseUrl, {
      params: { unreadOnly, limit }
    });
  }

  generate() {
    return this.http.post<{ created: number }>(`${this.baseUrl}/generate`, {});
  }

  markRead(id: string) {
    return this.http.post<void>(`${this.baseUrl}/${id}/read`, {});
  }
}
