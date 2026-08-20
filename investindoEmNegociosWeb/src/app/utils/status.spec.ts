import { expenseStatusLabel, incomeStatusLabel } from './status';

describe('status utils', () => {
  it('mapeia status de despesas', () => {
    expect(expenseStatusLabel('PAID')).toBe('Paga');
    expect(expenseStatusLabel('PARTIALLY_PAID')).toBe('Parcialmente paga');
    expect(expenseStatusLabel('CANCELED')).toBe('Cancelada');
    expect(expenseStatusLabel('ANTICIPATED')).toBe('Antecipada');
    expect(expenseStatusLabel('OVERDUE')).toBe('Atrasada');
    expect(expenseStatusLabel('OPEN')).toBe('Em aberto');
    expect(expenseStatusLabel('UNKNOWN')).toBe('Em aberto');
  });

  it('mapeia status de receitas', () => {
    expect(incomeStatusLabel('PAID')).toBe('Recebida');
    expect(incomeStatusLabel('PARTIALLY_PAID')).toBe('Parcialmente recebida');
    expect(incomeStatusLabel('CANCELED')).toBe('Cancelada');
    expect(incomeStatusLabel('ANTICIPATED')).toBe('Antecipada');
    expect(incomeStatusLabel('OVERDUE')).toBe('Em atraso');
    expect(incomeStatusLabel('OPEN')).toBe('Em aberto');
    expect(incomeStatusLabel(undefined)).toBe('Em aberto');
  });
});
