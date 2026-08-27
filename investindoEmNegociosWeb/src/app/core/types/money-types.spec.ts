import { toInstallmentStatus } from './money-types';

describe('toInstallmentStatus', () => {
  it('converte o PascalCase do backend para o UPPER_SNAKE do frontend', () => {
    expect(toInstallmentStatus('Open')).toBe('OPEN');
    expect(toInstallmentStatus('Paid')).toBe('PAID');
    expect(toInstallmentStatus('Canceled')).toBe('CANCELED');
    expect(toInstallmentStatus('Anticipated')).toBe('ANTICIPATED');
  });

  it('converte "PartiallyPaid" para "PARTIALLY_PAID" (o caso que um toUpperCase simples quebrava)', () => {
    expect(toInstallmentStatus('PartiallyPaid')).toBe('PARTIALLY_PAID');
    // regressão: toUpperCase() puro produziria "PARTIALLYPAID", inválido no frontend
    expect('PartiallyPaid'.toUpperCase()).toBe('PARTIALLYPAID');
  });

  it('é idempotente para valores já normalizados', () => {
    expect(toInstallmentStatus('PARTIALLY_PAID')).toBe('PARTIALLY_PAID');
    expect(toInstallmentStatus('OPEN')).toBe('OPEN');
  });

  it('cai em OPEN para vazio, nulo ou desconhecido', () => {
    expect(toInstallmentStatus('')).toBe('OPEN');
    expect(toInstallmentStatus(null)).toBe('OPEN');
    expect(toInstallmentStatus(undefined)).toBe('OPEN');
    expect(toInstallmentStatus('QualquerCoisa')).toBe('OPEN');
  });
});
