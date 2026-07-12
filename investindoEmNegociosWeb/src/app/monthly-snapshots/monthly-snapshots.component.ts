import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MonthlyFinancialSnapshotResponse, MonthlySnapshotsService } from '../monthly-snapshots.service';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { TransactionSummaryCardComponent, TransactionSummaryTone } from '../shared/transactions/transaction-summary-card.component';
import { StatusBadgeComponent, StatusBadgeTone } from '../shared/status-badge/status-badge.component';
import { UsageBarComponent, UsageBarTone } from '../shared/usage-bar/usage-bar.component';
import { UiStateComponent } from '../ui-state/ui-state.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { extractApiErrorMessage } from '../utils/api-error.utils';
import { riskBadgeTone, riskLevel, riskUsageTone } from './snapshots-overview.model';

@Component({
  selector: 'app-monthly-snapshots',
  standalone: true,
  imports: [
    CommonModule,
    AppCurrencyPipe,
    PageHeaderComponent,
    TransactionSummaryCardComponent,
    StatusBadgeComponent,
    UsageBarComponent,
    UiStateComponent,
    EmptyStateComponent
  ],
  templateUrl: './monthly-snapshots.component.html',
  styleUrl: './monthly-snapshots.component.scss'
})
export class MonthlySnapshotsComponent implements OnInit {
  snapshots: MonthlyFinancialSnapshotResponse[] = [];
  loading = false;
  generating = false;
  error = '';

  constructor(private readonly snapshotsService: MonthlySnapshotsService) {}

  ngOnInit(): void {
    this.load();
  }

  get latestSnapshot(): MonthlyFinancialSnapshotResponse | null {
    return this.snapshots[0] || null;
  }

  get latestRealBalance(): number {
    return Number(this.latestSnapshot?.realAvailableBalance || 0);
  }

  get latestProjectedBalance(): number {
    return Number(this.latestSnapshot?.projectedBalance || 0);
  }

  get latestRiskScore(): number {
    return Number(this.latestSnapshot?.riskScore || 0);
  }

  get latestRiskTone(): TransactionSummaryTone {
    const level = riskLevel(this.latestSnapshot?.riskClassification, this.latestRiskScore);
    return level === 'high' ? 'danger' : level === 'moderate' ? 'warning' : 'success';
  }

  riskBadgeTone(snapshot: MonthlyFinancialSnapshotResponse): StatusBadgeTone {
    return riskBadgeTone(riskLevel(snapshot.riskClassification, snapshot.riskScore));
  }

  riskUsageTone(snapshot: MonthlyFinancialSnapshotResponse): UsageBarTone {
    return riskUsageTone(riskLevel(snapshot.riskClassification, snapshot.riskScore));
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.snapshotsService.list().subscribe({
      next: (items) => {
        this.snapshots = items;
        this.loading = false;
      },
      error: (err) => {
        this.error = extractApiErrorMessage(err, 'Falha ao carregar snapshots.');
        this.loading = false;
      }
    });
  }

  generateCurrentMonth(): void {
    const now = new Date();
    this.generating = true;
    this.error = '';
    this.snapshotsService.generate(now.getFullYear(), now.getMonth() + 1).subscribe({
      next: (snapshot) => {
        this.snapshots = [snapshot, ...this.snapshots.filter((item) => item.id !== snapshot.id)];
        this.generating = false;
      },
      error: (err) => {
        this.error = extractApiErrorMessage(err, 'Falha ao gerar snapshot.');
        this.generating = false;
      }
    });
  }
}
