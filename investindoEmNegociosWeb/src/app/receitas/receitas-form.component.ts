import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf, DecimalPipe } from '@angular/common';
import { StoredIncome } from '../data/api-data.service';

@Component({
  selector: 'app-receitas-form',
  standalone: true,
  imports: [FormsModule, NgIf, DecimalPipe],
  templateUrl: './receitas-form.component.html',
  styleUrls: ['./receitas-form.component.scss']
})
export class ReceitasFormComponent {
  @Input() mostrarForm = false;
  @Input() novaRenda!: StoredIncome;
  @Input() valorInput = '';
  @Input() recebimentoInput = '';
  @Input() fixaInicioInput = '';
  @Input() erroData = '';
  @Input() valorSugestao: number | null = null;
  @Input() editandoId: string | null = null;
  @Input() resumoTexto = '';

  @Output() valorChange = new EventEmitter<string>();
  @Output() recebimentoChange = new EventEmitter<string>();
  @Output() fonteChange = new EventEmitter<string>();
  @Output() fixaChange = new EventEmitter<boolean>();
  @Output() fixaInicioChange = new EventEmitter<string>();
  @Output() aplicarSugestao = new EventEmitter<void>();
  @Output() salvarForm = new EventEmitter<void>();
  @Output() fechar = new EventEmitter<void>();

  onValorChange(v: string): void {
    this.valorChange.emit(v);
  }

  onRecebimentoChange(v: string): void {
    this.recebimentoChange.emit(v);
  }

  onFonteChange(v: string): void {
    this.fonteChange.emit(v);
  }

  onFixaChange(v: boolean): void {
    this.fixaChange.emit(v);
  }

  onFixaInicioChange(v: string): void {
    this.fixaInicioChange.emit(v);
  }

  usarSugestao(): void {
    this.aplicarSugestao.emit();
  }

  salvar(): void {
    this.salvarForm.emit();
  }

  fecharModal(): void {
    this.fechar.emit();
  }
}
