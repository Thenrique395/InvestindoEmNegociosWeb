import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AppCurrencyPipe } from '../../../../shared/app-currency.pipe';

export type DividendMonthBucket = { key: string; label: string; total: number };
export type DividendAssetBucket = { asset: string; total: number; percent: number };

@Component({
  selector: 'app-investment-dividends-panel',
  standalone: true,
  imports: [CommonModule, AppCurrencyPipe],
  templateUrl: './investment-dividends-panel.component.html',
  styleUrl: './investment-dividends-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvestmentDividendsPanelComponent {
  @Input() monthlySeries: DividendMonthBucket[] = [];
  @Input() monthlyMax = 1;
  @Input() total12Months = 0;
  @Input() monthlyAverage = 0;
  @Input() payingAssets = 0;
  @Input() assets: DividendAssetBucket[] = [];

  trackByIndex(index: number): number {
    return index;
  }
}
