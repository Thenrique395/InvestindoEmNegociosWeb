/**
 * Como um cartão se apresenta em lista, formulário e select.
 *
 * Estava triplicado — `despesas.component`, `despesas-form` e
 * `despesa-form-modal` tinham cada um a sua cópia de máscara, mapa de bandeira
 * e montagem do rótulo. Três cópias significam três lugares para esquecer de
 * mudar, e foi exatamente o que aconteceu quando o formato do número mudou.
 */

/** Bandeiras por id, para quando o lookup do backend não responde. */
const BANDEIRA_FALLBACK: Record<string, string> = {
  '1': 'VISA',
  '2': 'MASTERCARD',
  '3': 'ELO',
  '4': 'AMEX',
  '5': 'HIPERCARD'
};

/**
 * Só os quatro últimos dígitos.
 *
 * O formato anterior — `1234 *********** 6860` — gastava metade da coluna com
 * asteriscos que não identificam nada: quem reconhece o cartão reconhece pelos
 * quatro finais, e os quatro primeiros são o BIN, que é igual em todo cartão da
 * mesma emissão. Sem invenção de dígito: número curto devolve o que tem.
 */
export const cardLast4 = (numero?: string): string => {
  const digits = (numero || '').replace(/\D/g, '');
  return digits.slice(-4);
};

export const cardBrandName = (
  brandIdOrName: string | undefined,
  brandMap: Record<string, string> = {}
): string => {
  const raw = (brandIdOrName || '').toString().trim();
  if (!raw) return 'Cartão';
  return brandMap[raw] || brandMap[raw.toUpperCase()] || BANDEIRA_FALLBACK[raw] || raw.toUpperCase();
};

/** `Cartão - Mastercard - 6860`. Sem os quatro finais, fica só a bandeira. */
export const cardLabel = (
  card: { bandeira?: string; numero?: string } | null | undefined,
  brandMap: Record<string, string> = {}
): string => {
  if (!card) return 'Nenhum cartão selecionado';
  const bandeira = cardBrandName(card.bandeira, brandMap);
  const last4 = cardLast4(card.numero);
  return last4 ? `Cartão - ${bandeira} - ${last4}` : `Cartão - ${bandeira}`;
};
