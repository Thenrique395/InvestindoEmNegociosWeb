import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-toggle-field',
  standalone: true,
  imports: [],
  templateUrl: './toggle-field.component.html',
  styleUrl: './toggle-field.component.scss'
})
export class ToggleFieldComponent {
  @Input() label = '';
  @Input() description = '';
  @Input() compact = false;
  @Input() checked = false;
  @Input() disabled = false;
  @Output() checkedChange = new EventEmitter<boolean>();

  onChange(event: Event): void {
    this.checkedChange.emit((event.target as HTMLInputElement).checked);
  }
}
