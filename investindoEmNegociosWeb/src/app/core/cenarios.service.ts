import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface ScenarioSimulationRequest {
  period: string;
  referenceDate?: string | null;
  extraMonthlyIncome: number;
  extraMonthlyExpense: number;
  savingsRatePercent: number;
}

export interface ScenarioProjectionPoint {
  date: string;
  baseClosingBalance: number;
  scenarioClosingBalance: number;
}

export interface ScenarioSimulationResponse {
  period: string;
  referenceDate: string;
  baseProjectedClosingBalance: number;
  scenarioProjectedClosingBalance: number;
  impactAmount: number;
  monthlySavingsPotential: number;
  basePoints: ScenarioProjectionPoint[];
  scenarioPoints: ScenarioProjectionPoint[];
}

@Injectable({ providedIn: 'root' })
export class CenariosService {
  constructor(private readonly http: HttpClient) {}

  simulate(request: ScenarioSimulationRequest): Observable<ScenarioSimulationResponse> {
    return this.http.post<ScenarioSimulationResponse>(`${API_BASE_URL}/scenarios/simulate`, request);
  }
}
