export const onlyDigits = (value: string): string => (value || '').replace(/\D/g, '');

export const allowOnlyDigitsKeydown = (event: KeyboardEvent): void => {
  const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (allowedKeys.includes(event.key)) return;
  if (event.ctrlKey || event.metaKey) return;
  if (!/^\d$/.test(event.key)) {
    event.preventDefault();
  }
};

export const formatCurrencyFromDigits = (digits: string): string => {
  if (!digits) return '';
  const num = Number(digits) / 100;
  if (!Number.isFinite(num)) return '';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const maskMoneyInput = (value: string): string => {
  const digits = onlyDigits(value);
  return formatCurrencyFromDigits(digits);
};

export const maskDateDDMMYYYY = (value: string): string => {
  const digits = onlyDigits(value).slice(0, 8);
  const dia = digits.slice(0, 2);
  const mes = digits.slice(2, 4);
  const ano = digits.slice(4, 8);
  if (mes && (Number(mes) < 1 || Number(mes) > 12)) {
    return [dia].filter(Boolean).join('/');
  }
  return [dia, mes, ano].filter(Boolean).join('/');
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
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length !== 8) return null;
  const dia = Number(digits.slice(0, 2));
  const mes = Number(digits.slice(2, 4));
  const ano = Number(digits.slice(4, 8));
  const data = new Date(ano, mes - 1, dia);
  if (data.getFullYear() !== ano || data.getMonth() + 1 !== mes || data.getDate() !== dia) return null;
  return data;
};
