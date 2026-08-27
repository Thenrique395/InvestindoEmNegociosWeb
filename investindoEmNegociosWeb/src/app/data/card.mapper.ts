import { CardDto } from '../cards.service';
import { StoredCard } from './api-data.service';

/** Formato que as telas usam (StoredCard) a partir do que a API devolve (CardDto). */
export function toStoredCard(card: CardDto): StoredCard {
  return {
    id: card.id,
    bandeira: String(card.brandId),
    numero: card.last4,
    nome: card.nickname || card.holderName,
    holderName: card.holderName,
    banco: card.bank || '',
    limiteCredito: card.creditLimit ?? 0,
    diaFechamento: card.statementCloseDay ?? 1,
    diaVencimento: card.dueDay ?? 1
  };
}
