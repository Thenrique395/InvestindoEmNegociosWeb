import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormFieldComponent } from '../../../shared/form-field/form-field.component';

@Component({
  selector: 'app-account-form',
  standalone: true,
  imports: [CommonModule, FormsModule, FormFieldComponent],
  templateUrl: './account-form.component.html'
})
export class AccountFormComponent {
  @Input() form: any;
  @Input() editingId: string | null = null;
  @Input() saving = false;

  @Input() accountTypes: any[] = [];

  @Input() nameError = '';
  @Input() typeError = '';
  @Input() balanceError = '';

  @Input() submitted = false;

  @Output() save = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();

  @Output() touchField = new EventEmitter<string>();

  onSave() { this.save.emit(); }
  onClear() { this.clear.emit(); }
  onTouch(field: string) { this.touchField.emit(field); }
}
