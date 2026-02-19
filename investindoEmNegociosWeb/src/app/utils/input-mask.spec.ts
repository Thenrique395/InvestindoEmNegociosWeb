import { setLocaleSettings } from './locale-settings';
import {
  allowOnlyDigitsKeydown,
  formatCurrencyFromDigits,
  maskDateDDMMYYYY,
  maskMonthYear,
  parseDateDDMMYYYY
} from './input-mask';

describe('input-mask utils', () => {
  it('formata moeda a partir de digitos', () => {
    setLocaleSettings({ locale: 'pt-BR', currency: 'BRL' });
    expect(formatCurrencyFromDigits('1234')).toBe('12,34');
    expect(formatCurrencyFromDigits('')).toBe('');
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
