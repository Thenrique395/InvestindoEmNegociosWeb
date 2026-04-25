import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { applyListQuery, ListQuery } from './api-query';

export type GoalStatus = 'Planned' | 'InProgress' | 'Completed' | 'Canceled';

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  year: number;
  description?: string | null;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
  expectedMonthly: number;
  targetDate?: string | null;
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

  addContribution(goalId: string, payload: GoalContributionRequest): Observable<GoalContribution> {
    return this.http.post<GoalContribution>(`${this.baseUrl}/${goalId}/contributions`, payload);
  }

  listContributions(goalId: string, query?: ListQuery): Observable<GoalContribution[]> {
    const params = applyListQuery(new HttpParams(), query);
    return this.http.get<GoalContribution[]>(`${this.baseUrl}/${goalId}/contributions`, { params });
  }
}
