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
  | 'CashflowInsight'
  | 'AiHealthAlert';
export type MoneyType = 'Income' | 'Expense';

export interface CashflowInsightRecommendation {
  id?: string;
  severity?: 'danger' | 'warn' | 'info';
  text?: string;
  actionLabel?: string;
  route?: string;
  queryParams?: Record<string, string>;
  amount?: number;
  dueDate?: string;
}

export interface CashflowInsightPayload {
  scenario?: string;
  priority?: 'critical' | 'warning' | 'ok';
  healthScore?: number;
  riskDay?: string | null;
  overdueExpenses?: number;
  overdueIncomes?: number;
  dueSoonExpensesAmount?: number;
  currentCoverage?: number;
  projectedCoverage?: number;
  projectedBalance?: number;
  action?: string;
  reasonCodes?: string[];
  recommendations?: CashflowInsightRecommendation[];
  tips?: string[];
  scoreBreakdown?: string[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  kind: NotificationKind;
  moneyType?: MoneyType | null;
  dueDate?: string | null;
  createdAt: string;
  readAt?: string | null;
  payload?: CashflowInsightPayload | null;
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
