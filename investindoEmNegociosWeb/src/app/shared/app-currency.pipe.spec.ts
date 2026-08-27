import { TestBed } from '@angular/core/testing';
import { FinancialPrivacyService } from '../core/financial-privacy.service';
import { formatCurrencyValue } from '../core/utils/locale-utils';
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

  it('formats values using an explicit non-BRL currency when provided', () => {
    expect(pipe.transform(100, 'USD')).toBe(formatCurrencyValue(100, 'USD'));
    expect(pipe.transform(100, 'USD')).not.toBe(formatCurrencyValue(100));
  });

  it('falls back to the active currency when no currency argument is given', () => {
    expect(pipe.transform(100)).toBe(formatCurrencyValue(100));
  });

  it('masks hidden values regardless of the currency argument', () => {
    privacy.set(true, false);

    expect(pipe.transform(1234.56, 'EUR')).toBe('••••••');
  });

  it('treats null, undefined and non-numeric input as zero', () => {
    expect(pipe.transform(null)).toBe(formatCurrencyValue(0));
    expect(pipe.transform(undefined)).toBe(formatCurrencyValue(0));
    expect(pipe.transform('abc')).toBe(formatCurrencyValue(0));
  });
});
