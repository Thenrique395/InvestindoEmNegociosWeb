import { getLocaleSettings, setLocaleSettings } from './locale-settings';
import {
  allowOnlyDigitsKeydown,
  formatCurrencyFromDigits,
  maskDateDDMMYYYY,
  maskMoneyInput,
  MAX_MONEY_DIGITS,
  maskMonthYear,
  parseDateDDMMYYYY
} from './input-mask';

describe('input-mask utils', () => {
  const original = { ...getLocaleSettings() };

  afterEach(() => {
    setLocaleSettings(original);
  });

  it('formata moeda a partir de digitos', () => {
    setLocaleSettings({ locale: 'pt-BR', currency: 'BRL' });
    expect(formatCurrencyFromDigits('1234')).toBe('12,34');
    expect(formatCurrencyFromDigits('')).toBe('');
  });

  it('limita o valor a MAX_MONEY_DIGITS (evita overflow numeric(14,2) -> 500)', () => {
    setLocaleSettings({ locale: 'pt-BR', currency: 'BRL' });
    expect(MAX_MONEY_DIGITS).toBe(11);
    // 15 dígitos -> corta em 11 -> 999.999.999,99 (teto)
    expect(maskMoneyInput('999999999999999')).toBe('999.999.999,99');
    // valor normal continua intacto
    expect(maskMoneyInput('150000')).toBe('1.500,00');
  });

  it('mascara data em pt-BR e en-US', () => {
    setLocaleSettings({ locale: 'pt-BR' });
    expect(maskDateDDMMYYYY('12022026')).toBe('12/02/2026');

    setLocaleSettings({ locale: 'en-US' });
    expect(maskDateDDMMYYYY('12022026')).toBe('12/02/2026');
    expect(parseDateDDMMYYYY('12022026')?.toISOString().slice(0, 10)).toBe('2026-12-02');
  });

  it('mascara mes/ano com validacao de faixa', () => {
    expect(maskMonthYear('022026')).toBe('02/2026');
    expect(maskMonthYear('152026')).toBe('1');
  });

  it('bloqueia teclas nao numericas', () => {
    const event = new KeyboardEvent('keydown', { key: 'a' });
    spyOn(event, 'preventDefault');

    allowOnlyDigitsKeydown(event);

    expect(event.preventDefault).toHaveBeenCalled();
  });
});
