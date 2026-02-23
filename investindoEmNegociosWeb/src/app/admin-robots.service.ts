import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './api.config';

export interface RobotStatus {
  robotName: string;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastSuccess: boolean | null;
  lastProcessedCount: number;
  lastError: string | null;
}

export interface RobotExecutionLog {
  id: string;
  robotName: string;
  startedAt: string;
  finishedAt: string;
  success: boolean;
  processedCount: number;
  error: string | null;
}

export interface RobotMonitorResponse {
  robots: RobotStatus[];
  recentRuns: RobotExecutionLog[];
}

export interface RobotRunResult {
  robotName: string;
  startedAt: string;
  finishedAt: string;
  success: boolean;
  processedCount: number;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminRobotsService {
  private readonly baseUrl = `${API_BASE_URL}/admin/robots`;

  constructor(private http: HttpClient) {}

  monitor(take = 50) {
    return this.http.get<RobotMonitorResponse>(`${this.baseUrl}/monitor?take=${take}`);
  }

  run(robotName: string) {
    return this.http.post<RobotRunResult>(`${this.baseUrl}/run/${encodeURIComponent(robotName)}`, {});
  }

  runAll() {
    return this.http.post<RobotRunResult[]>(`${this.baseUrl}/run-all`, {});
  }
}
