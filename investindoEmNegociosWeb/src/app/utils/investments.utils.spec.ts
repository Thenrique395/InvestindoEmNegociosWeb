import { InvestmentPosition } from '../investments.service';
import {
  benchmarkMonthPercent,
  isAllocationType,
  isCurrentMonth,
  isProventoMovement,
  mapTargetAllocationResponse,
  normalize,
  normalizeAllocationValue,
  parseCsvRows,
  positionCurrentValue,
  positionNetContributed
} from './investments.utils';

function buildPosition(overrides: Partial<InvestmentPosition>): InvestmentPosition {
  return {
    id: '1',
    type: 'ACOES',
    asset: 'PETR4',
    quantity: 0,
    avgPrice: 0,
    openedAt: '2026-01-01',
    account: 'XP',
    movements: [],
    ...overrides
  };
}

describe('investments.utils', () => {
  describe('normalize', () => {
    it('remove acentos, espaços e converte para minúsculas', () => {
      expect(normalize('  Ações ')).toBe('acoes');
    });

    it('retorna string vazia para valor nulo/indefinido', () => {
      expect(normalize(undefined as unknown as string)).toBe('');
    });
  });

  describe('isProventoMovement', () => {
    it('considera provento DIVIDENDO, JCP e RENDIMENTO', () => {
      expect(isProventoMovement('DIVIDENDO')).toBeTrue();
      expect(isProventoMovement('JCP')).toBeTrue();
      expect(isProventoMovement('RENDIMENTO')).toBeTrue();
      expect(isProventoMovement('COMPRA')).toBeFalse();
    });
  });

  describe('benchmarkMonthPercent', () => {
    it('retorna o percentual mensal configurado para cada indice', () => {
      expect(benchmarkMonthPercent('CDI')).toBe(0.85);
      expect(benchmarkMonthPercent('IBOV')).toBe(1.1);
    });
  });

  describe('positionCurrentValue', () => {
    it('usa o preco de mercado quando disponivel', () => {
      const pos = buildPosition({ quantity: 10, avgPrice: 20, marketPrice: 25 });
      expect(positionCurrentValue(pos)).toBe(250);
    });

    it('usa o preco medio quando nao ha preco de mercado', () => {
      const pos = buildPosition({ quantity: 10, avgPrice: 20, marketPrice: null });
      expect(positionCurrentValue(pos)).toBe(200);
    });

    it('ignora preco de mercado zero ou negativo', () => {
      const pos = buildPosition({ quantity: 10, avgPrice: 20, marketPrice: 0 });
      expect(positionCurrentValue(pos)).toBe(200);
    });
  });

  describe('positionNetContributed', () => {
    it('multiplica quantidade pelo preco medio', () => {
      const pos = buildPosition({ quantity: 5, avgPrice: 30 });
      expect(positionNetContributed(pos)).toBe(150);
    });
  });

  describe('isCurrentMonth', () => {
    it('retorna verdadeiro para data no mesmo mes/ano de referencia', () => {
      expect(isCurrentMonth('2026-06-15T00:00:00Z', new Date(2026, 5, 1))).toBeTrue();
    });

    it('retorna falso para data em outro mes', () => {
      expect(isCurrentMonth('2026-05-15T00:00:00Z', new Date(2026, 5, 1))).toBeFalse();
    });

    it('retorna falso para data vazia', () => {
      expect(isCurrentMonth('', new Date(2026, 5, 1))).toBeFalse();
    });
  });

  describe('normalizeAllocationValue', () => {
    it('limita o valor entre 0 e 100', () => {
      expect(normalizeAllocationValue(150, 40)).toBe(100);
      expect(normalizeAllocationValue(-10, 40)).toBe(0);
      expect(normalizeAllocationValue(35, 40)).toBe(35);
    });

    it('retorna o fallback quando o valor nao e finito', () => {
      expect(normalizeAllocationValue('abc', 40)).toBe(40);
    });
  });

  describe('isAllocationType', () => {
    it('aceita RF, ACOES, FUNDOS e CRIPTO', () => {
      expect(isAllocationType('RF')).toBeTrue();
      expect(isAllocationType('ACOES')).toBeTrue();
      expect(isAllocationType('FUNDOS')).toBeTrue();
      expect(isAllocationType('CRIPTO')).toBeTrue();
    });

    it('rejeita IMOVEL e VEICULO', () => {
      expect(isAllocationType('IMOVEL')).toBeFalse();
      expect(isAllocationType('VEICULO')).toBeFalse();
    });
  });

  describe('mapTargetAllocationResponse', () => {
    it('normaliza os percentuais recebidos da API', () => {
      const result = mapTargetAllocationResponse({ rf: 150, acoes: -5, fundos: 20, cripto: 10 });
      expect(result).toEqual({ RF: 100, ACOES: 0, FUNDOS: 20, CRIPTO: 10 });
    });
  });

  describe('parseCsvRows', () => {
    it('converte linhas CSV em InvestmentPositionRequest', () => {
      const csv = [
        'type;asset;quantity;avgPrice;openedAt;account;category;note',
        'ACOES;PETR4;100;36,52;2026-01-15;XP;Dividendos;Compra inicial'
      ].join('\n');

      const rows = parseCsvRows(csv);

      expect(rows.length).toBe(1);
      expect(rows[0]).toEqual({
        type: 'ACOES',
        asset: 'PETR4',
        quantity: 100,
        avgPrice: 36.52,
        openedAt: '2026-01-15',
        account: 'XP',
        category: 'Dividendos',
        note: 'Compra inicial'
      });
    });

    it('retorna lista vazia quando ha apenas o cabecalho', () => {
      expect(parseCsvRows('type;asset;quantity;avgPrice;openedAt;account;category;note')).toEqual([]);
    });

    it('lanca erro para cabecalho invalido', () => {
      expect(() => parseCsvRows('asset;quantity\nPETR4;10')).toThrow();
    });

    it('lanca erro para tipo invalido', () => {
      const csv = [
        'type;asset;quantity;avgPrice;openedAt;account;category;note',
        'INVALIDO;PETR4;100;36,52;2026-01-15;XP;Dividendos;'
      ].join('\n');

      expect(() => parseCsvRows(csv)).toThrow();
    });

    it('lanca erro para quantidade ou preco invalidos', () => {
      const csv = [
        'type;asset;quantity;avgPrice;openedAt;account;category;note',
        'ACOES;PETR4;0;36,52;2026-01-15;XP;Dividendos;'
      ].join('\n');

      expect(() => parseCsvRows(csv)).toThrow();
    });

    it('aceita IMOVEL e VEICULO', () => {
      const csv = [
        'type;asset;quantity;avgPrice;openedAt;account;category;note',
        'IMOVEL;Casa;1;250000;2026-01-01;Patrimonio;Imovel;Manual',
        'VEICULO;Carro;1;80000;2026-01-01;Patrimonio;Veiculo;Manual'
      ].join('\n');

      const rows = parseCsvRows(csv);

      expect(rows.length).toBe(2);
      expect(rows[0].type).toBe('IMOVEL');
      expect(rows[1].type).toBe('VEICULO');
    });
  });
});
