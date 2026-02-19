import { setLocaleSettings } from './locale-settings';
import {
  formatCurrencyValue,
  formatLocaleDateFromIso,
  formatMonthLabelFromKey,
  monthKeyFromLocaleDate,
  parseLocalizedNumber,
  toIsoDateFromLocale
} from './locale-utils';

describe('locale-utils', () => {
  it('parseia numero localizado pt-BR', () => {
    setLocaleSettings({ locale: 'pt-BR', currency: 'BRL' });
    expect(parseLocalizedNumber('1.234,56')).toBe(1234.56);
  });

  it('formata moeda com locale ativo', () => {
    setLocaleSettings({ locale: 'pt-BR', currency: 'BRL' });
    expect(formatCurrencyValue(10)).toContain('10,00');
  });

  it('converte data local para ISO e chave de mes', () => {
    setLocaleSettings({ locale: 'pt-BR' });
    expect(toIsoDateFromLocale('18/02/2026')).toBe('2026-02-18');
    expect(monthKeyFromLocaleDate('18/02/2026')).toBe('2026-02');
  });

  it('retorna vazio para ISO invalido', () => {
    expect(formatLocaleDateFromIso('')).toBe('');
  });

  it('formata label de mes por chave', () => {
    setLocaleSettings({ locale: 'pt-BR' });
    expect(formatMonthLabelFromKey('2026-02', 'short').length).toBeGreaterThan(0);
    expect(formatMonthLabelFromKey('invalido')).toBe('invalido');
  });
});
