import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

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
  private baseUrl = `${API_BASE_URL}/goals`;

  constructor(private http: HttpClient) {}

  list(year?: number, status?: GoalStatus): Observable<Goal[]> {
    const params: Record<string, string> = {};
    if (year) params['year'] = year.toString();
    if (status) params['status'] = status;
    return this.http.get<Goal[]>(this.baseUrl, { params });
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

  listContributions(goalId: string): Observable<GoalContribution[]> {
    return this.http.get<GoalContribution[]>(`${this.baseUrl}/${goalId}/contributions`);
  }
}
