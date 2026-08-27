import { TestBed } from '@angular/core/testing';
import { FinancialPrivacyService } from './financial-privacy.service';

describe('FinancialPrivacyService', () => {
  let service: FinancialPrivacyService;

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('financial-values-hidden');
    service = TestBed.inject(FinancialPrivacyService);
  });

  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('financial-values-hidden');
  });

  it('toggles and persists financial value visibility', () => {
    service.toggle();

    expect(service.hidden()).toBeTrue();
    expect(document.documentElement.classList.contains('financial-values-hidden')).toBeTrue();
    expect(window.localStorage.getItem('investindo-em-negocios-hide-financial-values')).toBe('true');
  });
});
