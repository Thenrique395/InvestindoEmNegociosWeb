import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';
import { TooltipComponent } from '../shared/tooltip/tooltip.component';
import { InstallmentStatusTone } from '../utils/status';

export interface RecentMovementItem {
  id: string;
  title: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  status?: string;
  statusTone?: InstallmentStatusTone;
  recurring?: boolean;
}

@Component({
  selector: 'app-recent-movements-card',
  standalone: true,
  imports: [RouterLink, AppCurrencyPipe, StatusBadgeComponent, TooltipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recent-movements-card.component.html',
  styleUrl: './recent-movements-card.component.scss'
})
export class RecentMovementsCardComponent {
  readonly items = input.required<RecentMovementItem[]>();

  trackById(_index: number, item: RecentMovementItem): string {
    return item.id;
  }
}
