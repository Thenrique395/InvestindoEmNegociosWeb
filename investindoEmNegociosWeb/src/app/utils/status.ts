import { InstallmentStatus } from '../types/money-types';
import { parseDateDDMMYYYY } from './input-mask';

export const expenseStatusLabel = (status?: InstallmentStatus | string): string => {
  switch (status) {
    case 'PAID':
      return 'Pago';
    case 'PARTIALLY_PAID':
      return 'Parcial';
    case 'CANCELED':
      return 'Cancelado';
    case 'ANTICIPATED':
      return 'Antecipada';
    case 'OPEN':
    default:
      return 'Pendente';
  }
};

export const incomeStatusLabel = (recebimento?: string): string => {
  const data = recebimento ? parseDateDDMMYYYY(recebimento) : null;
  if (!data) return 'Pendente';
  const hoje = new Date();
  const diaHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const diaReceb = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  return diaReceb <= diaHoje ? 'Pago' : 'Pendente';
};
