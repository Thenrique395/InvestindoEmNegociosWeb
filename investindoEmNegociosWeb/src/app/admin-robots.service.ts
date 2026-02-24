import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './api.config';

export interface RobotExecutionMetrics {
  itemsGenerated: number;
  emailsAttempted: number;
  emailsSent: number;
  emailsFailed: number;
  zeroItemsReasonCode: string | null;
}

export interface RobotStatus {
  robotName: string;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastSuccess: boolean | null;
  lastProcessedCount: number;
  lastMetrics: RobotExecutionMetrics;
  lastError: string | null;
}

export interface RobotExecutionLog {
  id: string;
  robotName: string;
  startedAt: string;
  finishedAt: string;
  success: boolean;
  processedCount: number;
  metrics: RobotExecutionMetrics;
  error: string | null;
}

export interface RobotMonitorSummary {
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  successRatePercent: number;
  itemsGenerated: number;
  emailsAttempted: number;
  emailsSent: number;
  emailsFailed: number;
}

export interface RobotMonitorResponse {
  summary24h: RobotMonitorSummary;
  robots: RobotStatus[];
  recentRuns: RobotExecutionLog[];
}

export interface RobotRunResult {
  robotName: string;
  startedAt: string;
  finishedAt: string;
  success: boolean;
  processedCount: number;
  metrics: RobotExecutionMetrics;
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
