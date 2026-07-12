import { NetWorthHistoryPointResponse } from '../features/accounts/models/account.models';
import {
  debtAccentTone,
  debtBucketAccent,
  debtBucketPercent,
  netWorthDelta,
  netWorthMax,
  netWorthMin,
  netWorthScale
} from './dashboard-overview.model';

function point(netWorth: number, label = 'M'): NetWorthHistoryPointResponse {
  return {
    referenceDate: '2026-07-01', label,
    accountsBalance: 0, investmentsBalance: 0, tangibleAssetsBalance: 0,
    totalAssets: 0, totalLiabilities: 0, netWorth, isEstimated: false
  };
}

describe('dashboard-overview.model', () => {
  it('calcula max, min e delta do histórico', () => {
    const points = [point(100), point(150), point(120)];
    expect(netWorthMax(points)).toBe(150);
    expect(netWorthMin(points)).toBe(100);
    expect(netWorthDelta(points)).toBe(20); // 120 - 100
  });

  it('delta é zero com menos de dois pontos', () => {
    expect(netWorthDelta([])).toBe(0);
    expect(netWorthDelta([point(100)])).toBe(0);
  });

  it('escala patrimonial fica entre 18 e 100', () => {
    const points = [point(100), point(200)];
    expect(netWorthScale(100, points)).toBe(18); // mínimo
    expect(netWorthScale(200, points)).toBe(100); // máximo
  });

  it('escala usa 100 quando todos os pontos são iguais', () => {
    const points = [point(100), point(100)];
    expect(netWorthScale(100, points)).toBe(100);
  });

  it('acento do bucket por rótulo', () => {
    expect(debtBucketAccent('Em atraso')).toBe('danger');
    expect(debtBucketAccent('Cartões')).toBe('warning');
    expect(debtBucketAccent('Outras obrigações')).toBe('info');
  });

  it('traduz acento para tom da UsageBar', () => {
    expect(debtAccentTone('danger')).toBe('critical');
    expect(debtAccentTone('warning')).toBe('warning');
    expect(debtAccentTone('info')).toBe('ok');
  });

  it('participação do bucket é limitada a 0–100 e protege divisão por zero', () => {
    expect(debtBucketPercent(50, 200)).toBe(25);
    expect(debtBucketPercent(50, 0)).toBe(0);
    expect(debtBucketPercent(300, 200)).toBe(100);
  });
});
