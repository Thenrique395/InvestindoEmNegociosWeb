import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MonthlyFinancialSnapshotResponse, MonthlySnapshotsService } from '../monthly-snapshots.service';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';

@Component({
  selector: 'app-monthly-snapshots',
  standalone: true,
  imports: [CommonModule, AppCurrencyPipe],
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

  load(): void {
    this.loading = true;
    this.snapshotsService.list().subscribe({
      next: (items) => {
        this.snapshots = items;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Falha ao carregar snapshots.';
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
        this.error = err?.error?.detail || 'Falha ao gerar snapshot.';
        this.generating = false;
      }
    });
  }
}
