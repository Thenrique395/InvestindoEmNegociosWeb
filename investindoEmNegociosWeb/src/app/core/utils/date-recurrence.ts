/**
 * Recorrência mensal por dia do mês — usado por Cartões (vencimento de fatura) e
 * pelo Calendário. Função pura; vive em utils/ para não obrigar import entre features.
 */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function nextOccurrenceOfDay(day: number, today: Date): Date {
  const wanted = Math.max(Number(day) || 1, 1);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let year = today.getFullYear();
  let month = today.getMonth();
  let candidate = new Date(year, month, Math.min(wanted, lastDayOfMonth(year, month)));
  if (candidate < base) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    candidate = new Date(year, month, Math.min(wanted, lastDayOfMonth(year, month)));
  }
  return candidate;
}
