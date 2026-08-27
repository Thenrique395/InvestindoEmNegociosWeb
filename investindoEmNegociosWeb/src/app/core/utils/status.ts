import { InstallmentStatus } from '../types/money-types';

export type InstallmentStatusTone = 'success' | 'warning' | 'danger' | 'info' | 'muted';

/**
 * Status como a pessoa vê na tela.
 *
 * `OVERDUE` não existe no banco: é `OPEN` com vencimento no passado. Guardar
 * "atrasada" exigiria alguém virando o status de todo mundo à meia-noite —
 * derivar na leitura dá o mesmo resultado sem esse relógio.
 */
export type DisplayInstallmentStatus = InstallmentStatus | 'OVERDUE';

/** Converte DD/MM/AAAA em Date local; devolve null se não der para ler. */
const parseDataBr = (valor?: string): Date | null => {
  const [dia, mes, ano] = (valor || '').split('/');
  if (!dia || !mes || !ano) return null;
  const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
  return Number.isNaN(data.getTime()) ? null : data;
};

/** Status exibido: só quem está em aberto pode aparecer como atrasado. */
export const resolveInstallmentStatus = (
  status: InstallmentStatus | string | undefined,
  dataVencimento?: string
): DisplayInstallmentStatus => {
  const atual = (status || 'OPEN') as InstallmentStatus;
  if (atual !== 'OPEN') return atual;

  const vencimento = parseDataBr(dataVencimento);
  if (!vencimento) return 'OPEN';

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return vencimento < hoje ? 'OVERDUE' : 'OPEN';
};

export const installmentStatusTone = (
  status?: DisplayInstallmentStatus | string
): InstallmentStatusTone => {
  switch (status) {
    case 'PAID':
      return 'success';
    case 'PARTIALLY_PAID':
      return 'warning';
    case 'ANTICIPATED':
      return 'info';
    case 'OVERDUE':
      return 'danger';
    case 'CANCELED':
      return 'muted';
    case 'OPEN':
    default:
      return 'muted';
  }
};

/**
 * Glifo de cada status. Existe porque a cor sozinha não basta: `OPEN` e
 * `CANCELED` compartilham o tom `muted`, então "Em aberto" e "Cancelada"
 * ficavam idênticas na tabela. O ícone separa as duas sem inventar uma sétima
 * cor — e dá a quem não distingue verde de vermelho um segundo sinal.
 */
export type InstallmentStatusIcon = 'check' | 'alert' | 'clock' | 'forward' | 'half' | 'x';

export const installmentStatusIcon = (
  status?: DisplayInstallmentStatus | string
): InstallmentStatusIcon => {
  switch (status) {
    case 'PAID':
      return 'check';
    case 'PARTIALLY_PAID':
      return 'half';
    case 'ANTICIPATED':
      return 'forward';
    case 'OVERDUE':
      return 'alert';
    case 'CANCELED':
      return 'x';
    case 'OPEN':
    default:
      return 'clock';
  }
};

/* Despesa é feminina ("Paga", "Cancelada"); receita segue o mesmo gênero. */
export const expenseStatusLabel = (status?: DisplayInstallmentStatus | string): string => {
  switch (status) {
    case 'PAID':
      return 'Paga';
    case 'PARTIALLY_PAID':
      return 'Parcialmente paga';
    case 'CANCELED':
      return 'Cancelada';
    case 'ANTICIPATED':
      return 'Antecipada';
    case 'OVERDUE':
      return 'Atrasada';
    case 'OPEN':
    default:
      return 'Em aberto';
  }
};

export const incomeStatusLabel = (status?: DisplayInstallmentStatus | string): string => {
  switch (status) {
    case 'PAID':
      return 'Recebida';
    case 'PARTIALLY_PAID':
      return 'Parcialmente recebida';
    case 'CANCELED':
      return 'Cancelada';
    case 'ANTICIPATED':
      return 'Antecipada';
    case 'OVERDUE':
      return 'Em atraso';
    case 'OPEN':
    default:
      return 'Em aberto';
  }
};
