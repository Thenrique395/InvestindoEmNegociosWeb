import { setLocaleSettings } from './locale-settings';
import {
  formatCompactCurrency,
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

  describe('formatCompactCurrency', () => {
    it('abrevia a partir de mil, com o símbolo da moeda ativa', () => {
      setLocaleSettings({ locale: 'pt-BR', currency: 'BRL' });
      expect(formatCompactCurrency(12345)).toBe('R$ 12,3 mil');
      expect(formatCompactCurrency(-8000)).toBe('-R$ 8 mil');
    });

    it('abaixo de mil, usa o formato cheio', () => {
      setLocaleSettings({ locale: 'pt-BR', currency: 'BRL' });
      expect(formatCompactCurrency(999)).toContain('999,00');
    });

    it('respeita a moeda salva em Configurações', () => {
      // Era o bug: 'pt-BR'/'BRL' fixos no home e no category-breakdown faziam
      // um usuário em outra moeda ver R$ no eixo do gráfico.
      setLocaleSettings({ locale: 'en-US', currency: 'USD' });
      expect(formatCompactCurrency(12345)).toContain('$');
      expect(formatCompactCurrency(12345)).not.toContain('R$');
      setLocaleSettings({ locale: 'pt-BR', currency: 'BRL' });
    });
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
