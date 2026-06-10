import { TestBed } from '@angular/core/testing';
import { FinancialPrivacyService } from '../financial-privacy.service';
import { formatCurrencyValue } from '../utils/locale-utils';
import { AppCurrencyPipe } from './app-currency.pipe';

describe('AppCurrencyPipe', () => {
  let pipe: AppCurrencyPipe;
  let privacy: FinancialPrivacyService;

  beforeEach(() => {
    privacy = TestBed.inject(FinancialPrivacyService);
    privacy.set(false, false);
    pipe = new AppCurrencyPipe(privacy);
  });

  it('formats visible values using the active currency', () => {
    expect(pipe.transform(1234.56)).toBe(formatCurrencyValue(1234.56));
  });

  it('masks hidden values', () => {
    privacy.set(true, false);

    expect(pipe.transform(1234.56)).toBe('••••••');
  });
});
