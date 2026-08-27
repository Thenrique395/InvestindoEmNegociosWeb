import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { applyListQuery, ListQuery } from './api-query';

export type GoalStatus = 'Planned' | 'InProgress' | 'Completed' | 'Canceled' | 'Draft' | 'Scheduled' | 'Active' | 'Paused' | 'Archived';
export type GoalKind = 'General' | 'Expense' | 'Income' | 'Investment';
export type GoalMode = 'Limit' | 'Target' | 'RecurringContribution' | 'PeriodContribution' | 'AccumulatedValue';
export type RecurrenceType = 'None' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Semiannual' | 'Annual' | 'Custom';
export type GoalScopeType = 'Category' | 'Account' | 'Portfolio';
export type CalculatedGoalState = 'OnTrack' | 'Attention' | 'Exceeded' | 'Overdue' | 'Achieved';

export interface GoalScopeDto {
  scopeType: GoalScopeType;
  refId: string;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  year: number;
  description?: string | null;
  status: GoalStatus;
  kind: GoalKind;
  createdAt: string;
  updatedAt: string;
  expectedMonthly: number;
  targetDate?: string | null;
  // Fase B — planejamento (opcionais: backend antigo não os retorna)
  mode?: GoalMode;
  startDate?: string | null;
  endDate?: string | null;
  recurrence?: RecurrenceType;
  warningThreshold?: number | null;
  criticalThreshold?: number | null;
  archivedAt?: string | null;
  scopes?: GoalScopeDto[] | null;
}

export interface CreateGoalRequest {
  title: string;
  targetAmount: number;
  currentAmount: number;
  year: number;
  description?: string | null;
  status: GoalStatus;
  expectedMonthly: number;
  targetDate?: string | null;
  kind: GoalKind;
  mode?: GoalMode;
  startDate?: string | null;
  endDate?: string | null;
  recurrence?: RecurrenceType;
  warningThreshold?: number | null;
  criticalThreshold?: number | null;
  scopes?: GoalScopeDto[] | null;
}

export interface GoalProgress {
  goalId: string;
  kind: GoalKind;
  mode: GoalMode;
  target: number;
  realized: number;
  pending: number;
  percent: number;
  remaining: number;
  forecast?: number | null;
  daysRemaining?: number | null;
  state: CalculatedGoalState;
  start?: string | null;
  end?: string | null;
}

export interface GoalOccurrence {
  id: string;
  sequence: number;
  periodStart: string;
  periodEnd: string;
  targetAmount: number;
  realized: number;
  percent: number;
  status: string;
  isCurrent: boolean;
}

export interface GoalContribution {
  id: string;
  amount: number;
  date: string;
  note?: string | null;
  createdAt: string;
}

export interface GoalContributionRequest {
  amount: number;
  date: string;
  note?: string | null;
}

@Injectable({ providedIn: 'root' })
export class GoalsService {
  private readonly baseUrl = `${API_BASE_URL}/goals`;

  constructor(private http: HttpClient) {}

  list(year?: number, status?: GoalStatus, query?: ListQuery): Observable<Goal[]> {
    let params = new HttpParams();
    if (year) params = params.set('year', year.toString());
    if (status) params = params.set('status', status);
    params = applyListQuery(params, query);
    return this.http.get<Goal[]>(this.baseUrl, { params });
  }

  getIncomeGoal(year?: number): Observable<Goal | null> {
    let params = new HttpParams();
    if (year) params = params.set('year', year.toString());
    return this.http
      .get<Goal>(`${this.baseUrl}/income`, { params, observe: 'response' })
      .pipe(map((res) => (res.status === 204 ? null : res.body ?? null)));
  }

  upsertIncomeGoal(year: number, expectedMonthly: number): Observable<Goal> {
    return this.http.put<Goal>(`${this.baseUrl}/income`, { year, expectedMonthly });
  }

  create(payload: CreateGoalRequest): Observable<Goal> {
    return this.http.post<Goal>(this.baseUrl, payload);
  }

  update(id: string, payload: CreateGoalRequest): Observable<Goal> {
    return this.http.put<Goal>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // ---- Fase B: progresso, ocorrências e ciclo de vida ---------------------

  getProgress(id: string): Observable<GoalProgress> {
    return this.http.get<GoalProgress>(`${this.baseUrl}/${id}/progress`);
  }

  getOccurrences(id: string): Observable<GoalOccurrence[]> {
    return this.http.get<GoalOccurrence[]>(`${this.baseUrl}/${id}/occurrences`);
  }

  pause(id: string): Observable<Goal> {
    return this.http.post<Goal>(`${this.baseUrl}/${id}/pause`, {});
  }

  resume(id: string): Observable<Goal> {
    return this.http.post<Goal>(`${this.baseUrl}/${id}/resume`, {});
  }

  archive(id: string): Observable<Goal> {
    return this.http.post<Goal>(`${this.baseUrl}/${id}/archive`, {});
  }

  complete(id: string): Observable<Goal> {
    return this.http.post<Goal>(`${this.baseUrl}/${id}/complete`, {});
  }

  overrideCurrentOccurrence(id: string, targetAmount: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/occurrences/current`, { targetAmount });
  }

  addContribution(goalId: string, payload: GoalContributionRequest): Observable<GoalContribution> {
    return this.http.post<GoalContribution>(`${this.baseUrl}/${goalId}/contributions`, payload);
  }

  listContributions(goalId: string, query?: ListQuery): Observable<GoalContribution[]> {
    const params = applyListQuery(new HttpParams(), query);
    return this.http.get<GoalContribution[]>(`${this.baseUrl}/${goalId}/contributions`, { params });
  }
}
