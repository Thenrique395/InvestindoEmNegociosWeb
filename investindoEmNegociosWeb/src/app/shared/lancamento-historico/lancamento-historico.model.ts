import { formatCurrencyValue, formatLocaleDate } from '../../core/utils/locale-utils';

/**
 * Como cada evento do histórico é dito na tela.
 *
 * Fica separado do componente porque é tradução de domínio para linguagem, e
 * errar aqui é pior que errar layout: "Valor alterado" sem o de/para não conta
 * nada, e um evento do sistema atribuído a uma pessoa conta errado.
 */

/** Tipos que o backend emite (`PlanHistoryEventType`). */
export type HistoryEventType =
  | 'Created'
  | 'AmountChanged'
  | 'CategoryChanged'
  | 'TitleChanged'
  | 'DueDateChanged'
  | 'PaymentRegistered'
  | 'PaymentReversed'
  | 'Anticipated'
  | 'InstallmentDeleted'
  | 'DueDatePassed';

export interface HistoryEvent {
  readonly type: HistoryEventType | string;
  readonly occurredAt: string;
  readonly actorName?: string | null;
  readonly oldValue?: string | null;
  readonly newValue?: string | null;
  readonly installmentId?: string | null;
  readonly installmentNo?: number | null;
  readonly derived: boolean;
}

/** Cor do ponto na linha do tempo — a mesma escala de tom do resto do app. */
export type HistoryTone = 'info' | 'warning' | 'success' | 'danger' | 'muted';

export interface HistoryEventView {
  readonly label: string;
  /** Linha de apoio: data, hora, autor e o que mudou. */
  readonly detail: string;
  readonly tone: HistoryTone;
}

const ROTULOS: Record<HistoryEventType, { label: string; tone: HistoryTone }> = {
  Created: { label: 'Lançamento criado', tone: 'info' },
  AmountChanged: { label: 'Valor alterado', tone: 'warning' },
  CategoryChanged: { label: 'Categoria definida', tone: 'success' },
  TitleChanged: { label: 'Nome alterado', tone: 'info' },
  DueDateChanged: { label: 'Vencimento alterado', tone: 'warning' },
  PaymentRegistered: { label: 'Pagamento registrado', tone: 'success' },
  PaymentReversed: { label: 'Pagamento estornado', tone: 'warning' },
  Anticipated: { label: 'Parcela antecipada', tone: 'info' },
  InstallmentDeleted: { label: 'Parcela excluída', tone: 'danger' },
  DueDatePassed: { label: 'Vencimento ultrapassado', tone: 'danger' }
};

/** `2026-08-03T18:42:00Z` → `03/08/2026 · 18:42`. */
export function formatEventMoment(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;

  const hora = `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
  return `${formatLocaleDate(data)} · ${hora}`;
}

/** Valor do backend vem em invariante ("892.00") para não depender de locale. */
function money(value?: string | null): string | null {
  if (!value) return null;
  const numero = Number(value);
  return Number.isFinite(numero) ? formatCurrencyValue(numero) : value;
}

function isoDate(value?: string | null): string | null {
  if (!value) return null;
  const data = new Date(`${value}T00:00:00`);
  return Number.isNaN(data.getTime()) ? value : formatLocaleDate(data);
}

/**
 * Autor do evento. Sem nome, foi o sistema — e dizer "sistema" é mais honesto
 * que omitir: o vencimento que passou não foi ninguém que fez.
 */
function autor(event: HistoryEvent): string {
  return event.actorName?.trim() || 'sistema';
}

export function describeHistoryEvent(event: HistoryEvent): HistoryEventView {
  const base = ROTULOS[event.type as HistoryEventType] ?? { label: event.type, tone: 'muted' as HistoryTone };
  const partes: string[] = [formatEventMoment(event.occurredAt), autor(event)];

  switch (event.type) {
    case 'AmountChanged': {
      const de = money(event.oldValue);
      const para = money(event.newValue);
      if (de && para) partes.push(`de ${de} para ${para}`);
      break;
    }
    case 'CategoryChanged': {
      if (event.newValue) partes.push(event.newValue);
      break;
    }
    case 'TitleChanged': {
      if (event.oldValue && event.newValue) partes.push(`de "${event.oldValue}" para "${event.newValue}"`);
      break;
    }
    case 'DueDateChanged': {
      const de = isoDate(event.oldValue);
      const para = isoDate(event.newValue);
      if (de && para) partes.push(`de ${de} para ${para}`);
      break;
    }
    case 'PaymentRegistered': {
      const valor = money(event.newValue);
      if (valor) partes.push(valor);
      break;
    }
    default:
      break;
  }

  if (event.installmentNo) partes.push(`parcela ${event.installmentNo}`);

  return { label: base.label, detail: partes.join(' · '), tone: base.tone };
}

/* ---------------------------------------------------------------- parcelas */

export interface HistoryInstallment {
  readonly id: string;
  readonly numero: number;
  readonly total: number;
  readonly vencimento: string;
  readonly valor: number;
  readonly status: string;
}

export interface InstallmentProgress {
  readonly pagas: number;
  readonly total: number;
  /** 0 a 100, para a barra. */
  readonly percentual: number;
  readonly label: string;
}

const STATUS_PAGOS = new Set(['PAID', 'ANTICIPATED']);

/**
 * Progresso da série. "Parcialmente paga" não conta como paga: a barra mede o
 * que já saiu por completo, e arredondar para cima faria a pessoa achar que
 * deve menos do que deve.
 */
export function installmentProgress(parcelas: readonly HistoryInstallment[]): InstallmentProgress {
  const total = parcelas.length;
  const pagas = parcelas.filter((p) => STATUS_PAGOS.has((p.status || '').toUpperCase())).length;
  const percentual = total > 0 ? Math.round((pagas / total) * 100) : 0;

  return {
    pagas,
    total,
    percentual,
    label: total > 0 ? `${pagas} de ${total} parcelas pagas` : 'Sem parcelas'
  };
}

/** Tom do ponto de cada parcela na lista. */
export function installmentTone(status: string): HistoryTone {
  const normalizado = (status || '').toUpperCase();
  if (STATUS_PAGOS.has(normalizado)) return 'success';
  if (normalizado === 'PARTIALLY_PAID') return 'warning';
  if (normalizado === 'CANCELED') return 'muted';
  return 'muted';
}
