import { getLocaleSettings } from './locale-settings';

const fallbackLocale = 'pt-BR';
const fallbackCurrency = 'BRL';

export const getActiveLocale = (): string => getLocaleSettings().locale || fallbackLocale;

export const getActiveCurrency = (): string => getLocaleSettings().currency || fallbackCurrency;

export const formatNumberValue = (value: number, options?: Intl.NumberFormatOptions): string => {
  const locale = getActiveLocale();
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  }).format(value);
};

export const formatCurrencyValue = (
  value: number,
  currency?: string,
  /** Ajustes pontuais — ex.: `maximumFractionDigits: 0` para omitir centavos. */
  options?: Intl.NumberFormatOptions
): string => {
  const locale = getActiveLocale();
  const targetCurrency = currency || getActiveCurrency();
  return new Intl.NumberFormat(locale, { style: 'currency', currency: targetCurrency, ...options }).format(value);
};

/**
 * Moeda em forma curta, para eixo de gráfico e card estreito: `R$ 12,3 mil`.
 *
 * Existe aqui, e não em cada tela, por ARQUITETURA_ANGULAR.md §9.4 — a formatação
 * respeita a moeda e o locale salvos em Configurações. Estava duplicada no
 * `home.component` e no `category-breakdown`, as duas com `'pt-BR'` fixo, então um
 * usuário com outra moeda via o símbolo errado.
 */
export const formatCompactCurrency = (value: number, currency?: string): string => {
  const abs = Math.abs(value || 0);
  if (abs < 1000) return formatCurrencyValue(value, currency);

  const locale = getActiveLocale();
  const symbol = formatCurrencyValue(0, currency).replace(/[\d.,\s]/g, '');
  const sign = value < 0 ? '-' : '';
  const milhares = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(abs / 1000);
  return `${sign}${symbol} ${milhares} mil`;
};

export const parseLocalizedNumber = (value: string | number): number => {
  if (typeof value === 'number') return value;
  const raw = (value || '').toString().trim();
  if (!raw) return 0;
  const { group, decimal } = getLocaleSeparators(getActiveLocale());
  const normalized = raw
    .replace(new RegExp(`\\${group}`, 'g'), '')
    .replace(new RegExp(`\\${decimal}`), '.');
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const formatMonthYearLabel = (date: Date): string => {
  const locale = getActiveLocale();
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
};

export const formatMonthLabel = (year: number, monthIndex: number, length: 'long' | 'short' = 'long'): string => {
  const locale = getActiveLocale();
  return new Date(year, monthIndex, 1).toLocaleString(locale, { month: length });
};

export const formatMonthLabelFromKey = (value: string, length: 'long' | 'short' = 'long'): string => {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (Number.isNaN(year) || Number.isNaN(month)) return value;
  return formatMonthLabel(year, month, length);
};

export const formatLocaleDate = (date: Date): string => {
  const locale = getActiveLocale();
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

export const formatLocaleDateFromIso = (iso: string): string => {
  const date = parseIsoDate(iso);
  if (!date) return '';
  return formatLocaleDate(date);
};

export const parseLocaleDate = (value: string): Date | null => {
  const digits = (value || '').replace(/[^\d]/g, '').slice(0, 8);
  if (digits.length !== 8) return null;
  const partA = Number(digits.slice(0, 2));
  const partB = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const monthFirst = isMonthFirst(getActiveLocale());
  const month = monthFirst ? partA : partB;
  const day = monthFirst ? partB : partA;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (Number.isNaN(year)) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) return null;
  return date;
};

export const toIsoDateFromLocale = (value: string): string | null => {
  const date = parseLocaleDate(value);
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const monthKeyFromLocaleDate = (value: string): string | null => {
  const date = parseLocaleDate(value);
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const getLocaleSeparators = (locale: string): { group: string; decimal: string } => {
  const parts = new Intl.NumberFormat(locale).formatToParts(1000.1);
  const group = parts.find((p) => p.type === 'group')?.value || '.';
  const decimal = parts.find((p) => p.type === 'decimal')?.value || ',';
  return { group, decimal };
};

const isMonthFirst = (locale: string): boolean => locale.toLowerCase().startsWith('en');

const parseIsoDate = (iso: string): Date | null => {
  if (!iso) return null;
  const [year, month, day] = iso.split('T')[0].split('-').map(Number);
  if (!year || !month || !day) return null;
  // Use local date to avoid shifting a YYYY-MM-DD across timezones.
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};
