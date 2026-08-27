import { getActiveLocale } from './locale-utils';

export const onlyDigits = (value: string): string => (value || '').replace(/\D/g, '');

export const allowOnlyDigitsKeydown = (event: KeyboardEvent): void => {
  const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (allowedKeys.includes(event.key)) return;
  if (event.ctrlKey || event.metaKey) return;
  if (!/^\d$/.test(event.key)) {
    event.preventDefault();
  }
};

export const formatCurrencyFromDigits = (digits: string, locale = getActiveLocale()): string => {
  if (!digits) return '';
  const num = Number(digits) / 100;
  if (!Number.isFinite(num)) return '';
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};

// Teto de 11 dígitos = até 999.999.999,99, mantendo o valor dentro de numeric(14,2)
// do backend (evita erro 500 por overflow) e alinhado ao MoneyLimits.MaxAmount da API.
export const MAX_MONEY_DIGITS = 11;

export const maskMoneyInput = (value: string): string => {
  const digits = onlyDigits(value).slice(0, MAX_MONEY_DIGITS);
  return formatCurrencyFromDigits(digits);
};

export const maskDateDDMMYYYY = (value: string): string => {
  const locale = getActiveLocale();
  const monthFirst = locale.toLowerCase().startsWith('en');
  const digits = onlyDigits(value).slice(0, 8);
  const partA = digits.slice(0, 2);
  const partB = digits.slice(2, 4);
  const ano = digits.slice(4, 8);
  const mes = monthFirst ? partA : partB;
  const dia = monthFirst ? partB : partA;
  if (mes && (Number(mes) < 1 || Number(mes) > 12)) {
    return [partA].filter(Boolean).join('/');
  }
  return [partA, partB, ano].filter(Boolean).join('/');
};

export const maskMonthYear = (value: string): string => {
  const digits = onlyDigits(value).slice(0, 6);
  const mes = digits.slice(0, 2);
  const ano = digits.slice(2, 6);
  if (mes && (Number(mes) < 1 || Number(mes) > 12)) {
    return mes.slice(0, 1);
  }
  return [mes, ano].filter(Boolean).join('/');
};

export const parseDateDDMMYYYY = (value: string): Date | null => {
  const locale = getActiveLocale();
  const monthFirst = locale.toLowerCase().startsWith('en');
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length !== 8) return null;
  const partA = Number(digits.slice(0, 2));
  const partB = Number(digits.slice(2, 4));
  const ano = Number(digits.slice(4, 8));
  const mes = monthFirst ? partA : partB;
  const dia = monthFirst ? partB : partA;
  const data = new Date(ano, mes - 1, dia);
  if (data.getFullYear() !== ano || data.getMonth() + 1 !== mes || data.getDate() !== dia) return null;
  return data;
};
