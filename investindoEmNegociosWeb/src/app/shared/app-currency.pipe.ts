import { Pipe, PipeTransform } from '@angular/core';
import { FinancialPrivacyService } from '../financial-privacy.service';
import { formatCurrencyValue } from '../utils/locale-utils';

@Pipe({
  name: 'appCurrency',
  standalone: true,
  pure: false
})
export class AppCurrencyPipe implements PipeTransform {
  constructor(private readonly financialPrivacy: FinancialPrivacyService) {}

  transform(value: number | string | null | undefined, currency?: string): string {
    if (this.financialPrivacy.hidden()) return '••••••';

    const numericValue = Number(value ?? 0);
    return formatCurrencyValue(Number.isFinite(numericValue) ? numericValue : 0, currency);
  }
}
