import { InvestmentPosition, InvestmentPositionRequest, InvestmentType, MovementType } from '../investments.service';
import { parseLocalizedNumber } from './locale-utils';

export type BenchmarkKey = 'CDI' | 'IPCA' | 'IFIX' | 'IBOV' | 'SMLL' | 'IDIV' | 'IVVB11';
export type AllocationInvestmentType = 'RF' | 'ACOES' | 'FUNDOS' | 'CRIPTO';

// Ponto de partida editável pelo usuário (fallback do default do backend) —
// não é recomendação de investimento.
export const DEFAULT_TARGET_ALLOCATION: Record<AllocationInvestmentType, number> = { RF: 30, ACOES: 30, FUNDOS: 30, CRIPTO: 10 };

export function normalize(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function isProventoMovement(type: MovementType): boolean {
  return type === 'DIVIDENDO' || type === 'JCP' || type === 'RENDIMENTO';
}

export function benchmarkMonthPercent(key: BenchmarkKey): number {
  const monthly: Record<BenchmarkKey, number> = {
    CDI: 0.85,
    IPCA: 0.45,
    IFIX: 0.7,
    IBOV: 1.1,
    SMLL: 1.25,
    IDIV: 0.95,
    IVVB11: 1.05
  };
  return monthly[key] ?? 0.85;
}

export function positionCurrentValue(pos: InvestmentPosition): number {
  const market = pos.marketPrice ?? null;
  const price = market && market > 0 ? market : (pos.avgPrice || 0);
  return (pos.quantity || 0) * price;
}

export function positionNetContributed(pos: InvestmentPosition): number {
  return (pos.quantity || 0) * (pos.avgPrice || 0);
}

export function isCurrentMonth(iso: string, now: Date): boolean {
  if (!iso) return false;
  const [year, month] = iso.split('T')[0].split('-').map(Number);
  return !!year && !!month && year === now.getFullYear() && month === now.getMonth() + 1;
}

export function normalizeAllocationValue(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(0, parsed));
}

export function isAllocationType(type: InvestmentType): type is AllocationInvestmentType {
  return type === 'RF' || type === 'ACOES' || type === 'FUNDOS' || type === 'CRIPTO';
}

export function mapTargetAllocationResponse(target: { rf: number; acoes: number; fundos: number; cripto: number }): Record<AllocationInvestmentType, number> {
  return {
    RF: normalizeAllocationValue(target.rf, DEFAULT_TARGET_ALLOCATION.RF),
    ACOES: normalizeAllocationValue(target.acoes, DEFAULT_TARGET_ALLOCATION.ACOES),
    FUNDOS: normalizeAllocationValue(target.fundos, DEFAULT_TARGET_ALLOCATION.FUNDOS),
    CRIPTO: normalizeAllocationValue(target.cripto, DEFAULT_TARGET_ALLOCATION.CRIPTO)
  };
}

export function parseCsvRows(text: string): InvestmentPositionRequest[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map((h) => normalize(h));
  const idx = (name: string) => headers.indexOf(normalize(name));

  const typeI = idx('type');
  const assetI = idx('asset');
  const qtyI = idx('quantity');
  const avgI = idx('avgprice');
  const openedI = idx('openedat');
  const accountI = idx('account');
  const categoryI = idx('category');
  const noteI = idx('note');

  if ([typeI, assetI, qtyI, avgI, openedI, accountI].some((i) => i < 0)) {
    throw new Error('Cabeçalho CSV inválido. Esperado: type,asset,quantity,avgPrice,openedAt,account,category,note');
  }

  const validTypes = new Set<InvestmentType>(['RF', 'ACOES', 'FUNDOS', 'CRIPTO', 'IMOVEL', 'VEICULO']);
  return lines.slice(1).map((line) => {
    const cols = line.split(delimiter).map((c) => c.trim());
    const type = (cols[typeI] || '').toUpperCase() as InvestmentType;
    if (!validTypes.has(type)) throw new Error(`Tipo inválido no CSV: ${cols[typeI]}`);

    const quantity = parseLocalizedNumber(cols[qtyI] || '0');
    const avgPrice = parseLocalizedNumber(cols[avgI] || '0');
    if (!quantity || !avgPrice) throw new Error(`Quantidade/preço inválidos para ativo ${cols[assetI]}`);

    return {
      type,
      asset: cols[assetI],
      quantity,
      avgPrice,
      openedAt: cols[openedI],
      account: cols[accountI],
      category: cols[categoryI] || '',
      note: noteI >= 0 ? cols[noteI] || null : null,
      currency: 'BRL'
    };
  });
}
