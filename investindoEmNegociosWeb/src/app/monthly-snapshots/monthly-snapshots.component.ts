import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MonthlyFinancialSnapshotResponse, MonthlySnapshotsService } from '../monthly-snapshots.service';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { TransactionSummaryCardComponent, TransactionSummaryTone } from '../shared/transactions/transaction-summary-card.component';
import { StatusBadgeComponent, StatusBadgeTone } from '../shared/status-badge/status-badge.component';
import { UsageBarComponent, UsageBarTone } from '../shared/usage-bar/usage-bar.component';
import { UiStateComponent } from '../ui-state/ui-state.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { extractApiErrorMessage } from '../utils/api-error.utils';
import { riskBadgeTone, riskLevel, riskPercent, riskUsageTone } from './snapshots-overview.model';

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
  styleUrl: './monthly-snapshots.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MonthlySnapshotsComponent implements OnInit {
  snapshots: MonthlyFinancialSnapshotResponse[] = [];
  loading = false;
  generating = false;
  error = '';

  constructor(
    private readonly snapshotsService: MonthlySnapshotsService,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef
  ) {}

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

  get latestPendingExpenses(): number {
    return Number(this.latestSnapshot?.pendingExpenses || 0);
  }

  get latestPendingIncomes(): number {
    return Number(this.latestSnapshot?.pendingIncomes || 0);
  }

  get latestTotalDebt(): number {
    return Number(this.latestSnapshot?.totalDebt || 0);
  }

  get latestNetWorth(): number {
    return Number(this.latestSnapshot?.netWorth || 0);
  }

  riskBadgeTone(snapshot: MonthlyFinancialSnapshotResponse): StatusBadgeTone {
    return riskBadgeTone(riskLevel(snapshot.riskClassification, snapshot.riskScore));
  }

  /** O score é saúde; a barra de risco mostra o que falta para 100. */
  riskPercent(score: number): number {
    return riskPercent(score);
  }

  riskUsageTone(snapshot: MonthlyFinancialSnapshotResponse): UsageBarTone {
    return riskUsageTone(riskLevel(snapshot.riskClassification, snapshot.riskScore));
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.snapshotsService.list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (items) => {
        this.snapshots = items;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = extractApiErrorMessage(err, 'Falha ao carregar snapshots.');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  generateCurrentMonth(): void {
    const now = new Date();
    this.generating = true;
    this.error = '';
    this.snapshotsService.generate(now.getFullYear(), now.getMonth() + 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (snapshot) => {
        this.snapshots = [snapshot, ...this.snapshots.filter((item) => item.id !== snapshot.id)];
        this.generating = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = extractApiErrorMessage(err, 'Falha ao gerar snapshot.');
        this.generating = false;
        this.cdr.markForCheck();
      }
    });
  }
}
