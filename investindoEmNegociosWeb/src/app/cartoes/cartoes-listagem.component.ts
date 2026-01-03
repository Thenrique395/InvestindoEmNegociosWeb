import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor, NgIf, UpperCasePipe } from '@angular/common';
import { StoredCard } from '../data/api-data.service';
import { CardBrandLookup } from '../lookups.service';

@Component({
  selector: 'app-cartoes-listagem',
  standalone: true,
  imports: [NgFor, NgIf, UpperCasePipe],
  templateUrl: './cartoes-listagem.component.html',
  styleUrls: ['./cartoes-listagem.component.scss']
})
export class CartoesListagemComponent {
  @Input() cards: StoredCard[] = [];
  @Input() brands: CardBrandLookup[] = [];
  @Output() remover = new EventEmitter<string>();
  @Output() editar = new EventEmitter<StoredCard>();

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

  numeroProtegido(numero: string): string {
    const digits = (numero || '').replace(/\s+/g, '');
    const padded = digits.padEnd(16, '•').slice(0, 16);
    const masked = `${padded.slice(0, 12)}••••`;
    return masked.match(/.{1,4}/g)?.join(' ') || '•••• •••• •••• ••••';
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
}
