import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { InstallmentStatusTone } from '../utils/status';

export interface DashboardActivityItem {
  id: string;
  title: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  status?: string;
  statusTone?: InstallmentStatusTone;
  recurring?: boolean;
}

export interface DashboardReminderItem {
  id: string;
  title: string;
  dueLabel: string;
  amount: number;
  tone: 'danger' | 'warning' | 'info';
  statusLabel: string;
}

@Component({
  selector: 'app-dashboard-activity-board',
  standalone: true,
  imports: [RouterLink, AppCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-activity-board.component.html',
  styleUrl: './dashboard-activity-board.component.scss'
})
export class DashboardActivityBoardComponent {
  readonly activities = input.required<DashboardActivityItem[]>();
  readonly reminders = input.required<DashboardReminderItem[]>();

  trackActivity(_index: number, item: DashboardActivityItem): string {
    return item.id;
  }

  trackReminder(_index: number, item: DashboardReminderItem): string {
    return item.id;
  }
}
