import { InstallmentStatus } from '../types/money-types';

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

export const incomeStatusLabel = (status?: InstallmentStatus | string): string => {
  switch (status) {
    case 'PAID':
      return 'Recebido';
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
