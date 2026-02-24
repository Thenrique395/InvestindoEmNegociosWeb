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
  lastDurationMs: number;
  lastSuccess: boolean | null;
  lastProcessedCount: number;
  lastMetrics: RobotExecutionMetrics;
  lastCorrelationId: string | null;
  lastHostName: string | null;
  lastError: string | null;
}

export interface RobotExecutionLog {
  id: string;
  robotName: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  correlationId: string;
  hostName: string;
  triggeredByUserId: string | null;
  success: boolean;
  processedCount: number;
  metrics: RobotExecutionMetrics;
  wasSkipped: boolean;
  skipReason: string | null;
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
  durationMs: number;
  correlationId: string;
  hostName: string;
  triggeredByUserId: string | null;
  success: boolean;
  processedCount: number;
  metrics: RobotExecutionMetrics;
  wasSkipped: boolean;
  skipReason: string | null;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminRobotsService {
  private readonly baseUrl = `${API_BASE_URL}/admin/robots`;

  constructor(private http: HttpClient) {}

  monitor(query: {
    take?: number;
    robotName?: string;
    success?: boolean | null;
    from?: string | null;
    to?: string | null;
    search?: string;
  } = {}) {
    const params = new URLSearchParams();
    params.set('take', String(query.take ?? 50));
    if (query.robotName) params.set('robotName', query.robotName);
    if (query.success !== null && query.success !== undefined) params.set('success', String(query.success));
    if (query.from) params.set('from', query.from);
    if (query.to) params.set('to', query.to);
    if (query.search) params.set('search', query.search);
    return this.http.get<RobotMonitorResponse>(`${this.baseUrl}/monitor?${params.toString()}`);
  }

  run(robotName: string, options: { force?: boolean; cooldownMinutes?: number } = {}) {
    const params = new URLSearchParams();
    params.set('force', String(options.force ?? false));
    params.set('cooldownMinutes', String(options.cooldownMinutes ?? 10));
    return this.http.post<RobotRunResult>(`${this.baseUrl}/run/${encodeURIComponent(robotName)}?${params.toString()}`, {});
  }

  runAll() {
    return this.http.post<RobotRunResult[]>(`${this.baseUrl}/run-all`, {});
  }
}
