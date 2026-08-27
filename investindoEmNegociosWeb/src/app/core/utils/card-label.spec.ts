import { cardBrandName, cardLabel, cardLast4 } from './card-label';

describe('card-label', () => {
  it('devolve só os quatro últimos dígitos', () => {
    expect(cardLast4('5432 1098 7654 6860')).toBe('6860');
    expect(cardLast4('5432109876546860')).toBe('6860');
  });

  it('não inventa dígito quando o número é curto', () => {
    // A máscara antiga completava com asterisco e dava a impressão de haver
    // mais número do que existe. Aqui o que falta simplesmente não aparece.
    expect(cardLast4('123')).toBe('123');
    expect(cardLast4('')).toBe('');
    expect(cardLast4(undefined)).toBe('');
  });

  it('resolve a bandeira pelo lookup e cai no fallback por id', () => {
    expect(cardBrandName('2', { '2': 'Mastercard' })).toBe('Mastercard');
    expect(cardBrandName('2')).toBe('MASTERCARD');
    expect(cardBrandName('VISA')).toBe('VISA');
    expect(cardBrandName(undefined)).toBe('Cartão');
  });

  it('monta o rótulo sem máscara', () => {
    const card = { bandeira: '2', numero: '5432109876546860' };
    expect(cardLabel(card, { '2': 'Mastercard' })).toBe('Cartão - Mastercard - 6860');
    expect(cardLabel(card, { '2': 'Mastercard' })).not.toContain('*');
  });

  it('omite o trecho do número quando não há dígitos', () => {
    expect(cardLabel({ bandeira: '2', numero: '' }, { '2': 'Mastercard' })).toBe('Cartão - Mastercard');
  });

  it('avisa quando não há cartão escolhido', () => {
    expect(cardLabel(null)).toBe('Nenhum cartão selecionado');
  });
});
