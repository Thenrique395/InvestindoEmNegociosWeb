import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor, NgIf, UpperCasePipe } from '@angular/common';
import { StoredCard } from '../data/local-db.service';

@Component({
  selector: 'app-cartoes-listagem',
  standalone: true,
  imports: [NgFor, NgIf, UpperCasePipe],
  templateUrl: './cartoes-listagem.component.html',
  styleUrls: ['./cartoes-listagem.component.scss']
})
export class CartoesListagemComponent {
  @Input() cards: StoredCard[] = [];
  @Output() remover = new EventEmitter<string>();
  @Output() editar = new EventEmitter<StoredCard>();

  numeroProtegido(numero: string): string {
    const digits = (numero || '').replace(/\s+/g, '');
    const padded = digits.padEnd(16, '•').slice(0, 16);
    const masked = `${padded.slice(0, 12)}••••`;
    return masked.match(/.{1,4}/g)?.join(' ') || '•••• •••• •••• ••••';
  }

  isMastercard(bandeira: string): boolean {
    return (bandeira || '').toLowerCase() === 'mastercard';
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
