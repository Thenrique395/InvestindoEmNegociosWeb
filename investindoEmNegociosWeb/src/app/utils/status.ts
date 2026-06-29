import { InstallmentStatus } from '../types/money-types';

export type InstallmentStatusTone = 'success' | 'warning' | 'danger' | 'info' | 'muted';

export const installmentStatusTone = (status?: InstallmentStatus | string): InstallmentStatusTone => {
  switch (status) {
    case 'PAID':
      return 'success';
    case 'PARTIALLY_PAID':
      return 'warning';
    case 'ANTICIPATED':
      return 'info';
    case 'CANCELED':
      return 'danger';
    case 'OPEN':
    default:
      return 'warning';
  }
};

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
