import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StoredIncome } from '../data/api-data.service';
import { CategoryDto } from '../categories.service';
import { DigitOnlyDirective } from '../utils/digit-only.directive';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { ModalComponent } from '../shared/modal/modal.component';
import { FormFieldComponent } from '../shared/form-field/form-field.component';
import { ToggleFieldComponent } from '../shared/toggle-field/toggle-field.component';
import { DatePickerComponent } from '../shared/date-picker/date-picker.component';

@Component({
  selector: 'app-receitas-form',
  standalone: true,
  imports: [FormsModule, DigitOnlyDirective, RouterLink, AppCurrencyPipe, ModalComponent, FormFieldComponent, ToggleFieldComponent, DatePickerComponent],
  templateUrl: './receitas-form.component.html',
  styleUrls: ['./receitas-form.component.scss']
})
export class ReceitasFormComponent {
  @Input() mostrarForm = false;
  @Input() novaRenda!: StoredIncome;
  @Input() categorias: CategoryDto[] = [];
  @Input() valorInput = '';
  @Input() recebimentoInput = '';
  @Input() erroData = '';
  @Input() erroCategoria = '';
  @Input() valorSugestao: number | null = null;
  @Input() editandoId: string | null = null;
  @Input() resumoTexto = '';
  @Input() saving = false;

  @Output() valorChange = new EventEmitter<string>();
  @Output() recebimentoChange = new EventEmitter<string>();
  @Output() fonteChange = new EventEmitter<string>();
  @Output() fixaChange = new EventEmitter<boolean>();
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

  usarSugestao(): void {
    this.aplicarSugestao.emit();
  }

  salvar(): void {
    this.salvarForm.emit();
  }

  fecharModal(): void {
    this.fechar.emit();
  }
  trackByIndex(index: number, _item?: unknown): number {
    return index;
  }

}
