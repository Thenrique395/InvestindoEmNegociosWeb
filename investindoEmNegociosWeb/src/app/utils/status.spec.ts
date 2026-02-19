import { expenseStatusLabel, incomeStatusLabel } from './status';

describe('status utils', () => {
  it('mapeia status de despesas', () => {
    expect(expenseStatusLabel('PAID')).toBe('Pago');
    expect(expenseStatusLabel('PARTIALLY_PAID')).toBe('Parcial');
    expect(expenseStatusLabel('CANCELED')).toBe('Cancelado');
    expect(expenseStatusLabel('ANTICIPATED')).toBe('Antecipada');
    expect(expenseStatusLabel('OPEN')).toBe('Pendente');
    expect(expenseStatusLabel('UNKNOWN')).toBe('Pendente');
  });

  it('mapeia status de receitas', () => {
    expect(incomeStatusLabel('PAID')).toBe('Recebido');
    expect(incomeStatusLabel('PARTIALLY_PAID')).toBe('Parcial');
    expect(incomeStatusLabel('CANCELED')).toBe('Cancelado');
    expect(incomeStatusLabel('ANTICIPATED')).toBe('Antecipada');
    expect(incomeStatusLabel('OPEN')).toBe('Pendente');
    expect(incomeStatusLabel(undefined)).toBe('Pendente');
  });
});
