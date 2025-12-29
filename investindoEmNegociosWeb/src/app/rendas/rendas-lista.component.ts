import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { StoredIncome } from '../data/local-db.service';

@Component({
  selector: 'app-rendas-lista',
  standalone: true,
  imports: [NgFor, NgIf, DecimalPipe],
  templateUrl: './rendas-lista.component.html',
  styleUrls: ['./rendas-lista.component.scss']
})
export class RendasListaComponent {
  @Input() rendas: StoredIncome[] = [];
  @Output() editar = new EventEmitter<string>();
  @Output() remover = new EventEmitter<string>();

  onEditar(id: string): void {
    this.editar.emit(id);
  }

  onRemover(id: string): void {
    this.remover.emit(id);
  }
}
