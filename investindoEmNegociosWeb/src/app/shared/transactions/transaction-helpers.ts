import { formatMonthYearLabel, getActiveLocale, parseLocaleDate } from '../../utils/locale-utils';

/**
 * Helpers puros compartilhados pelas telas de lançamentos (Receitas e Despesas).
 *
 * Consolidam lógica que havia divergido entre os dois componentes (auditoria A7):
 * chave/label de mês, comparação de datas locais e ordenação textual. Versões
 * canônicas — as duas telas passam a se comportar igual.
 */

/** Chave de competência "YYYY-MM" a partir de uma data. */
export function monthKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Label do mês a partir da chave "YYYY-MM". Canônico: mês por extenso + ano
 * (ex.: "julho de 2026"). Retorna a própria chave se ela for inválida.
 */
export function monthLabelFromKey(key: string): string {
  const [year, month] = key.split('-').map((value) => Number(value));
  if (!year || !month) return key;
  return formatMonthYearLabel(new Date(year, month - 1, 1));
}

/**
 * Compara duas datas no formato local (dd/mm/aaaa) de forma ascendente.
 * Canônico: entradas sem data válida vão para o fim.
 */
export function compareLocaleDate(a?: string | null, b?: string | null): number {
  const da = parseLocaleDate(a || '');
  const db = parseLocaleDate(b || '');
  if (!da && !db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  return da.getTime() - db.getTime();
}

/**
 * Ordenação textual sensível ao locale ativo, ignorando caixa e acentos
 * (sensitivity: 'base'). Canônico para as duas telas.
 */
export function collate(a?: string | null, b?: string | null): number {
  return (a || '').localeCompare(b || '', getActiveLocale(), { sensitivity: 'base' });
}
