import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { StoredCard } from '../data/api-data.service';
import { CardBrandLookup } from '../lookups.service';

@Component({
  selector: 'app-cartoes-listagem',
  standalone: true,
  imports: [NgClass, DecimalPipe],
  templateUrl: './cartoes-listagem.component.html',
  styleUrls: ['./cartoes-listagem.component.scss']
})
export class CartoesListagemComponent {
  @Input() cards: StoredCard[] = [];
  @Input() brands: CardBrandLookup[] = [];
  @Input() emptyTitle = 'Sem cartões cadastrados';
  @Input() emptyDescription = 'Adicione seu primeiro cartão para acompanhar limites e vencimentos.';
  @Input() emptyCtaLabel = 'Adicionar cartão';
  @Output() remover = new EventEmitter<string>();
  @Output() editar = new EventEmitter<StoredCard>();
  @Output() emptyAction = new EventEmitter<void>();

  private brandLookup(value: string): CardBrandLookup | undefined {
    const normalized = (value || '').toString();
    const target = normalized.toLowerCase();
    return this.brands.find(
      (b) =>
        String(b.id) === normalized ||
        (b.code || '').toLowerCase() === target ||
        (b.name || '').toLowerCase() === target
    );
  }

  brandCode(card: StoredCard): string {
    const raw = this.brandLookup(card.bandeira)?.code || card.bandeira;
    return (raw || '').toString().toLowerCase();
  }

  brandName(card: StoredCard): string {
    return this.brandLookup(card.bandeira)?.name || card.bandeira || 'Sem bandeira';
  }

  cardToneClass(card: StoredCard): string {
    const code = this.brandCode(card);

    switch (code) {
      case 'visa':
        return 'cards-list__card--visa';
      case 'mastercard':
        return 'cards-list__card--mastercard';
      case 'elo':
        return 'cards-list__card--elo';
      case 'amex':
      case 'american-express':
        return 'cards-list__card--amex';
      default:
        return 'cards-list__card--default';
    }
  }

  numeroProtegido(numero: string): string {
    const digits = (numero || '').replace(/\D/g, '');
    if (!digits) return '•••• •••• •••• ••••';

    const first = digits.slice(0, 4).padEnd(4, '•');
    const last = digits.slice(-4).padStart(4, '•');
    return `${first} •••• •••• ${last}`;
  }

  isMastercard(code: string): boolean {
    return (code || '').toLowerCase() === 'mastercard';
  }

  finalCartao(numero?: string): string {
    if (!numero) return '••••';
    const digits = numero.replace(/\D/g, '');
    return digits.slice(-4).padStart(4, '•');
  }

  onEditar(card: StoredCard): void {
    this.editar.emit(card);
  }

  onRemover(id: string): void {
    this.remover.emit(id);
  }

  trackByIndex(index: number, _item?: unknown): number {
    return index;
  }
}
