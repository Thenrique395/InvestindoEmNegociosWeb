import { expenseStatusLabel, incomeStatusLabel, installmentStatusIcon, installmentStatusTone } from './status';

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

  it('dá um glifo próprio a cada status', () => {
    expect(installmentStatusIcon('PAID')).toBe('check');
    expect(installmentStatusIcon('PARTIALLY_PAID')).toBe('half');
    expect(installmentStatusIcon('ANTICIPATED')).toBe('forward');
    expect(installmentStatusIcon('OVERDUE')).toBe('alert');
    expect(installmentStatusIcon('CANCELED')).toBe('x');
    expect(installmentStatusIcon('OPEN')).toBe('clock');
    expect(installmentStatusIcon(undefined)).toBe('clock');
  });

  it('separa por glifo os dois status que dividem o mesmo tom', () => {
    // OPEN e CANCELED são ambos `muted`: sem o ícone, "Em aberto" e
    // "Cancelada" ficam idênticas na tabela. É a razão de o mapa existir.
    expect(installmentStatusTone('OPEN')).toBe(installmentStatusTone('CANCELED'));
    expect(installmentStatusIcon('OPEN')).not.toBe(installmentStatusIcon('CANCELED'));
  });

  it('não repete glifo entre status de tom diferente', () => {
    const todos = ['OPEN', 'PARTIALLY_PAID', 'PAID', 'ANTICIPATED', 'CANCELED', 'OVERDUE'];
    const glifos = todos.map((s) => installmentStatusIcon(s));
    expect(new Set(glifos).size).toBe(todos.length);
  });
});